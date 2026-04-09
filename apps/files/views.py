from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, inline_serializer
from rest_framework import serializers

from .serializers import FileUploadSerializer, FileResponseSerializer
from .services import upload_image
from botocore.exceptions import BotoCoreError, ClientError
from rest_framework.exceptions import APIException

class S3UploadError(APIException):
    status_code = 500
    default_detail = 'Failed to upload file. Please try again.'

class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser]

    @extend_schema(
        summary="Upload Image",
        description="Uploads an image to S3 and creates a File record. Limits to 5MB and JPEG/PNG/WebP formats. Returns file_id and url.",
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'image': {
                        'type': 'string',
                        'format': 'binary'
                    }
                },
                'required': ['image']
            }
        },
        responses={
            201: FileResponseSerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="UploadValidationError",
                    fields={
                        "image": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(
                        name="Invalid format",
                        summary="Invalid format",
                        value={"image": ["Only JPEG, PNG and WebP formats are accepted."]}
                    ),
                    OpenApiExample(
                        name="File too large",
                        summary="File too large",
                        value={"image": ["Image must not exceed 5MB."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="UploadUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        summary="Missing or invalid token",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            )
        }
    )
    def post(self, request):
        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file = serializer.validated_data['image']

        try:
            file_record = upload_image(          # ← Gọi Facade, không cần biết bên trong
                file=serializer.validated_data['image'],
                user=request.user,
            )
        except (BotoCoreError, ClientError):
            raise S3UploadError()
        return Response(
            FileResponseSerializer(file_record).data,
            status=status.HTTP_201_CREATED,
        )
