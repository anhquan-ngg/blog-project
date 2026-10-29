import re
from django.db import IntegrityError, transaction
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
        request = self.context.get("request")
        if not request or not request.user:
            raise serializers.ValidationError({"non_field_errors": ["Request context is required."]})
        if request.user.id == target.id:
            raise serializers.ValidationError({"non_field_errors": ["You cannot unban yourself."]})
        if target.is_active: 
            raise serializers.ValidationError({"non_field_errors": ["User is already active."]})
        target.is_active = True
        target.save(update_fields=["is_active"])

        return target

    def get_detail(self, obj) -> str:
        if obj.is_active:
            return "User has been unbanned."
        return "User has been banned."


class AdminUserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_active',
            'is_staff',
            'date_joined',
        ]
        read_only_fields = fields

class ImportUserFromCSVSerializer(serializers.Serializer):
    file = serializers.FileField()
    
    def validate_file(self, file): 
        if file.content_type not in ALLOWED_FORMATS or not file.name.lower().endswith('.csv'): 
            raise serializers.ValidationError("Only CSV files are accepted.")
        if file.size > MAX_SIZE_BYTES: 
            raise serializers.ValidationError("File size must not exceed 10MB.")
        return file

class UserCSVRowSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name']

    def validate_username(self, value):
        if not (3 <= len(value) <= 50):
            raise serializers.ValidationError("Username must be between 3 and 50 characters.")
        
        if not re.match(r'^[a-zA-Z0-9@._-]+$', value):
            raise serializers.ValidationError("Username must contain only letters, numbers, @, ., _, or -.")
        
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate_password(self, value):
        pattern = r'^(?=.*[a-zA-Z])(?=.*\d).{8,50}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("Password must be 8-50 characters and contain at least one letter and one digit.")
        return value

    def validate(self, attrs):
        batch_usernames = self.context.get("batch_usernames")
        batch_emails = self.context.get("batch_emails")
        if batch_usernames is not None:
            normalized_username = (attrs.get("username") or "").strip().lower()
            if normalized_username in batch_usernames:
                raise serializers.ValidationError({"username": ["Duplicate username in CSV batch."]})
        if batch_emails is not None:
            normalized_email = (attrs.get("email") or "").strip().lower()
            if normalized_email in batch_emails:
                raise serializers.ValidationError({"email": ["Duplicate email in CSV batch."]})

        first_name = attrs.get('first_name') or ''
        last_name = attrs.get('last_name') or ''
        if len(first_name) > 100:
            raise serializers.ValidationError({'first_name': ['First name must be at most 100 characters.']})
        if len(last_name) > 100:
            raise serializers.ValidationError({'last_name': ['Last name must be at most 100 characters.']})

        if batch_usernames is not None:
            batch_usernames.add((attrs.get("username") or "").strip().lower())
        if batch_emails is not None:
            batch_emails.add((attrs.get("email") or "").strip().lower())
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        try:
            with transaction.atomic():
                return User.objects.create_user(password=password, **validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"non_field_errors": ["Duplicate username or email detected (database constraint)."]}
            ) from exc
     