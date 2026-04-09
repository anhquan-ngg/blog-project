from drf_spectacular.types import OpenApiTypes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, LoginSerializer
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse, OpenApiExample
from rest_framework import serializers

class RegisterView(APIView):
    permission_classes = []
    
    @extend_schema(
        summary="Sign Up",
        description="Creates a new user account. Validates input and saves to DB. Does not return a token (requires calling /login/ afterwards).",
        request=RegisterSerializer,
        responses={
            201: RegisterSerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="RegisterValidationError",
                    fields={
                        "username": serializers.ListField(child=serializers.CharField(), required=False),
                        "email": serializers.ListField(child=serializers.CharField(), required=False),
                        "password": serializers.ListField(child=serializers.CharField(), required=False),
                        "non_field_errors": serializers.ListField(child=serializers.CharField(), required=False),
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(
                        name="Validation errors",
                        summary="Validation errors",
                        value={
                            "username": ["A user with that username already exists."],
                            "email": ["This email is already registered."],
                            "password": ["Password must be 8–50 characters and contain at least one letter and one digit."],
                            "non_field_errors": ["Passwords do not match."]
                        }
                    )
                ]
            )
        }
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = []
    
    @extend_schema(
        summary="Log In",
        description="Authenticates the user and returns a DRF Token (1 user - 1 token).",
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name='LoginResponse',
                fields={
                    'token': serializers.CharField()
                }
            ),
            400: OpenApiResponse(
                response=inline_serializer(
                    name="LoginValidationError",
                    fields={
                        "username": serializers.ListField(child=serializers.CharField(), required=False),
                        "password": serializers.ListField(child=serializers.CharField(), required=False),
                        "non_field_errors": serializers.ListField(child=serializers.CharField(), required=False),
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(
                        name="Invalid credentials or banned",
                        summary="Invalid credentials or banned account",
                        value={
                            "non_field_errors": ["Unable to log in with provided credentials."]
                        }
                    ),
                    OpenApiExample(
                        name="Missing fields",
                        summary="Missing fields",
                        value={
                            "username": ["This field is required."],
                            "password": ["This field is required."]
                        }
                    )
                ]
            )
        }
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
        }, status=status.HTTP_200_OK)

class LogoutView(APIView): 
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Log Out",
        description="Logs out completely by removing the user's DRF Token from the system. The token will be invalidated.",
        request=None,
        responses={
            204: OpenApiTypes.NONE,
            401: OpenApiResponse(
                response=inline_serializer(
                    name="UnauthorizedResponse",
                    fields={
                        "detail": serializers.CharField()
                    }
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        summary="Missing or invalid token",
                        value={
                            "detail": "Authentication credentials were not provided."
                        }
                    )
                ]
            )
        }
    )
    def post(self, request): 
        request.user.auth_token.delete()
        return Response({}, status=status.HTTP_204_NO_CONTENT)