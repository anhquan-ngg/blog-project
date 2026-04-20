from drf_spectacular.types import OpenApiTypes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, LoginSerializer, CurrentUserSerializer, UpdateCurrentUserSerializer
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers
from apps.posts.models import Post, Like, Bookmark
from apps.posts.serializers import PostListSerializer
from apps.posts.views import _thumbnail_prefetch, _annotate_user_actions
from core.pagination import CustomLimitOffsetPagination

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
                    name="UserRegisterValidationError",
                    fields={
                        "username": serializers.ListField(child=serializers.CharField(), required=False),
                        "email": serializers.ListField(child=serializers.CharField(), required=False),
                        "password": serializers.ListField(child=serializers.CharField(), required=False),
                        "password_confirm": serializers.ListField(child=serializers.CharField(), required=False),
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
                            "password": ["Password must be 8-50 characters and contain at least one letter and one digit."],
                            "non_field_errors": ["Passwords do not match."]
                        }
                    ),
                    OpenApiExample(
                        name="Missing fields",
                        summary="Missing fields",
                        value={
                            "username": ["This field is required."],
                            "email": ["This field is required."],
                            "password": ["This field is required."],
                            "password_confirm": ["This field is required."]
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
                name='UserLoginResponse',
                fields={
                    'token': serializers.CharField()
                }
            ),
            400: OpenApiResponse(
                response=inline_serializer(
                    name="UserLoginValidationError",
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
                    name="UserLogoutUnauthorizedError",
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
        if request.auth is not None:
            request.auth.delete()
        return Response({}, status=status.HTTP_204_NO_CONTENT)


# ── GET /api/auth/me/  &  PATCH /api/auth/me/ ────────────────────────────────

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="View Current User Profile",
        description="Returns profile information of the authenticated user.",
        responses={
            200: CurrentUserSerializer,
            401: OpenApiResponse(
                response=inline_serializer(
                    name="UserMeGetUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            )
        }
    )
    def get(self, request):
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update Current User Profile",
        description="Partially updates the authenticated user's profile. Only `first_name` and `last_name` can be changed (max 100 characters each).",
        request=UpdateCurrentUserSerializer,
        responses={
            200: CurrentUserSerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="UserMeUpdateValidationError",
                    fields={
                        "first_name": serializers.ListField(child=serializers.CharField(), required=False),
                        "last_name": serializers.ListField(child=serializers.CharField(), required=False),
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(
                        name="Field too long",
                        value={"first_name": ["Ensure this field has no more than 100 characters."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="UserMeUpdateUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            )
        }
    )
    def patch(self, request):
        serializer = UpdateCurrentUserSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CurrentUserSerializer(request.user).data, status=status.HTTP_200_OK)


# ── GET /api/me/liked/ ───────────────────────────────────────────────────────

class LikedPostsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="View Liked Posts",
        description="Returns a paginated list of posts the authenticated user has liked, ordered by most recently liked first.",
        parameters=[
            OpenApiParameter("limit", OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Number of items per page (max 100)", default=10),
            OpenApiParameter("offset", OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Number of items to skip", default=0),
        ],
        responses={
            200: PostListSerializer(many=True),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="UserLikedUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            )
        }
    )
    def get(self, request):
        qs = (
            Post.objects.filter(likes__user=request.user, is_deleted=False)
            .select_related("author", "category")
            .prefetch_related("tags", _thumbnail_prefetch())
            .order_by("-likes__created_at")
        )
        qs = _annotate_user_actions(qs, request.user)

        paginator = CustomLimitOffsetPagination()
        paginated_qs = paginator.paginate_queryset(qs, request)
        serializer = PostListSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


# ── GET /api/me/bookmarks/ ───────────────────────────────────────────────────

class BookmarkedPostsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="View Bookmarked Posts",
        description="Returns a paginated list of posts the authenticated user has bookmarked, ordered by most recently bookmarked first.",
        parameters=[
            OpenApiParameter("limit", OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Number of items per page (max 100)", default=10),
            OpenApiParameter("offset", OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Number of items to skip", default=0),
        ],
        responses={
            200: PostListSerializer(many=True),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="UserBookmarksUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            )
        }
    )
    def get(self, request):
        qs = (
            Post.objects.filter(bookmarks__user=request.user, is_deleted=False)
            .select_related("author", "category")
            .prefetch_related("tags", _thumbnail_prefetch())
            .order_by("-bookmarks__created_at")
        )
        qs = _annotate_user_actions(qs, request.user)

        paginator = CustomLimitOffsetPagination()
        paginated_qs = paginator.paginate_queryset(qs, request)
        serializer = PostListSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)