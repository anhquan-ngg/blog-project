from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser

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
