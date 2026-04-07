from rest_framework import serializers
from .models import File

MAX_SIZE_BYTES   = 5 * 1024 * 1024
ALLOWED_FORMATS  = {'image/jpeg', 'image/png', 'image/webp'}


class FileUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()

    def validate_image(self, file):
        # Only accept JPEG, PNG, WebP
        if file.content_type not in ALLOWED_FORMATS:
            raise serializers.ValidationError(
                "Only JPEG, PNG and WebP formats are accepted."
            )
        # Maximum 5MB
        if file.size > MAX_SIZE_BYTES:
            raise serializers.ValidationError(
                "Image must not exceed 5MB."
            )
        return file


class FileResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model  = File
        fields = ['id', 'url', 'uploaded_at']