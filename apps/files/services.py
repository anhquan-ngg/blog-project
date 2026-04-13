import uuid
import boto3
from django.conf import settings

def _get_s3_client():
    """
    Initialize boto3 S3 client from Django settings.
    """
    return boto3.client(
        's3',
        aws_access_key_id     = settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key = settings.AWS_SECRET_ACCESS_KEY,
        region_name           = settings.AWS_S3_REGION_NAME,
    )


def upload_image_to_s3(file, user_id: int) -> tuple[str, str]:
    """
    Upload file to S3.
    Returns: (s3_key, public_url)
    """
    ext     = file.name.rsplit('.', 1)[-1].lower()
    s3_key  = f"uploads/{user_id}/{uuid.uuid4()}.{ext}"

    s3_client = _get_s3_client()

    s3_client.upload_fileobj(
        file,
        settings.AWS_STORAGE_BUCKET_NAME,
        s3_key,
        ExtraArgs={'ContentType': file.content_type},
    )

    url = (
        f"https://{settings.AWS_STORAGE_BUCKET_NAME}"
        f".s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
    )
    return s3_key, url

def upload_image(file, user):
    """
    Facade: Full upload flow — S3 + DB record.
    Caller doesn't need to know S3, doesn't need to know File.objects.create(). 
    """
    from .models import File, FileStatus  # Lazy import

    s3_key, url = upload_image_to_s3(file, user.id)
    file_record = File.objects.create(
        uploaded_by = user,
        url         = url,
        s3_key      = s3_key,
        status      = FileStatus.ACTIVE,
        entity_type = None,
        entity_id   = None,
    )
    return file_record

def delete_image_from_s3(s3_key: str) -> None:
    """
    Delete file from S3 by s3_key.
    Note: S3 does not raise an error if the key does not exist.
    """
    s3_client = _get_s3_client()
    s3_client.delete_object(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=s3_key,
    )