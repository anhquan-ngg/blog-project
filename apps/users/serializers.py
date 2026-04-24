from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth import authenticate
import re

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta: 
        model = User
        fields = ['id','username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined'] # read only fields, db automatically set these fields
        
        
    def validate_username(self, value: str) -> str:
        # Length validation
        if not (3 <= len(value) <= 50):
            raise serializers.ValidationError("Username must be between 3 and 50 characters.")
        
        # Character validation
        if not re.match(r'^[a-zA-Z0-9@._-]+$', value):
            raise serializers.ValidationError("Username must contain only letters, numbers, @, ., _, or -.")
        
        # Unique validation
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value
    
    def validate_email(self, value: str) -> str:
        # Unique validation 
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value
        
    def validate_password(self, value: str) -> str:
        pattern = r'^(?=.*[a-zA-Z])(?=.*\d).{8,50}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("Password must be 8–50 characters and contain at least one letter and one digit.")
        
        return value
        
    def validate(self, attrs: dict) -> dict:
        # Check password confirmation
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"non_field_errors": ['Passwords do not match.']})
        
        # Validate first_name and last_name
        first_name = attrs.get('first_name') or ''
        last_name = attrs.get('last_name') or ''
        if len(first_name) > 100: 
            raise serializers.ValidationError({
                'first_name': ['First name must be at most 100 characters.']
            })
            
        if len(last_name) > 100:
            raise serializers.ValidationError({
                'last_name': ['Last name must be at most 100 characters.']
            })
            
        return attrs
        
    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            **validated_data)
        return user
    
class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'date_joined']
        read_only_fields = fields


class UpdateCurrentUserSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)

    class Meta:
        model = User
        fields = ['first_name', 'last_name']

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save(update_fields=['first_name', 'last_name'])
        return instance


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    
    def validate(self, data: dict) -> dict:
        username = data.get('username')
        password = data.get('password')

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError({
                'non_field_errors': ['Unable to log in with provided credentials.']
            })
        
        data['user'] = user
        return data