from .models import Comment
from apps.files.models import File, FileStatus

def attach_file_to_comment(file_id: int, comment: Comment) -> None:
    updated = File.objects.filter(
        pk=file_id,
        uploaded_by=comment.author,
        status=FileStatus.ACTIVE,
        entity_type__isnull=True,
        entity_id__isnull=True,
    ).update(
        entity_type='comment',
        entity_id=comment.id,
    )
    if updated != 1:
        raise ValueError(
            f"File {file_id} is not available for attachment."
        )

def detach_file_from_comment(comment: Comment) -> None:
    File.objects.filter(entity_type='comment', entity_id=comment.id).update(
        entity_type=None,
        entity_id=None
    )