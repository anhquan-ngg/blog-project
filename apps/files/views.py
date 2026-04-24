from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
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
            201: OpenApiResponse(
                response=FileResponseSerializer,
                description="Created",
                examples=[
                    OpenApiExample(
                        name="Success Example",
                        summary="Successfully created file record",
                        value={
                            "id": 15,
                            "url": "https://s3.amazonaws.com/bucket/uploads/1/abc123.jpg",
                            "uploaded_at": "2024-01-16T08:30:00Z"
                        }
                    )
                ]
            ),
            400: OpenApiResponse(
                response=inline_serializer(
                    name="FileUploadValidationError",
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
                    name="FileUploadUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        summary="Authentication credentials were not provided.",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            500: OpenApiResponse(
                response=inline_serializer(
                    name="FileUploadServerError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Internal Server Error",
                examples=[
                    OpenApiExample(
                        name="S3 Upload Error",
                        summary="Failed to upload file to S3 or database",
                        value={"detail": "Failed to upload file. Please try again."}
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
