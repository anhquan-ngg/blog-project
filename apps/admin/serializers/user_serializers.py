from rest_framework import serializers
from django.contrib.auth.models import User

MAX_SIZE_BYTES   = 10 * 1024 * 1024
ALLOWED_FORMATS  = {'text/csv'}

class BanUserSerializer(serializers.ModelSerializer):
    detail = serializers.SerializerMethodField()

    class Meta: 
        model = User
        fields = ['id', 'username', 'is_active', 'detail']
        read_only_fields = ['id', 'username']

    def ban(self):
        request = self.context.get("request")
        target = self.instance

        if not request or not request.user:
            raise serializers.ValidationError({"non_field_errors": ["Request context is required."]})

        if request.user.id == target.id or target.is_staff or getattr(target, 'is_superuser', False) or not target.is_active:
            raise serializers.ValidationError({"non_field_errors": ["You cannot ban yourself, another admin or banned user."]})

        target.is_active = False
        target.save(update_fields=["is_active"])

        return target
    
    def unban(self): 
        target = self.instance
        if target.is_active: 
            raise serializers.ValidationError({"non_field_errors": ["User is already active."]})
        target.is_active = True
        target.save(update_fields=["is_active"])

        return target

    def get_detail(self, obj):
        if obj.is_active:
            return "User has been unbanned."
        return "User has been banned."

class ImportUserFromCSVSerializer(serializers.Serializer):
    file = serializers.FileField()
    
    def validate_file(self, file): 
        if file.content_type not in ALLOWED_FORMATS: 
            raise serializers.ValidationError("Only CSV files are accepted.")
        if file.size > MAX_SIZE_BYTES: 
            raise serializers.ValidationError("File size must not exceed 10MB.")
        return file     