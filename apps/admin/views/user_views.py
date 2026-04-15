from rest_framework.generics import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.admin.serializers.user_serializers import BanUserSerializer
from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView
from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema, OpenApiResponse

class BanUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = BanUserSerializer

    @extend_schema(
        summary="Ban User",
        description="Ban a user account by setting its is_active status to False. Only Admins can perform this action. You cannot ban yourself, another Admin, or an already banned user.",
        request=None,
        responses={
            200: BanUserSerializer,
            400: OpenApiResponse(description="Bad Request - Cannot ban yourself, another admin, or an already banned user"),
            401: OpenApiResponse(description="Unauthorized - Token is missing or invalid"),
            403: OpenApiResponse(description="Forbidden - User is not an admin"),
            404: OpenApiResponse(description="Not Found - User does not exist"),
        }
    )
    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk)
        serializer = self.serializer_class(target, context={'request': request})
        serializer.ban()
        return Response(serializer.data, status=status.HTTP_200_OK)

class UnbanUserView(APIView): 
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = BanUserSerializer

    @extend_schema(
        summary="Unban User",
        description="Unban a user account by setting its is_active status to True. Only Admins can perform this action. You cannot unban an already active user.",
        request=None,
        responses={
            200: BanUserSerializer,
            400: OpenApiResponse(description="Bad Request - Cannot unban an already active user"),
            401: OpenApiResponse(description="Unauthorized - Token is missing or invalid"),
            403: OpenApiResponse(description="Forbidden - User is not an admin"),
            404: OpenApiResponse(description="Not Found - User does not exist"),
        }
    )
    def post(self, request, pk): 
        target = get_object_or_404(User, pk=pk)
        serializer = self.serializer_class(target, context={'request': request})
        serializer.unban()
        return Response(serializer.data, status=status.HTTP_200_OK)
