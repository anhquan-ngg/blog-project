from core.pagination import CustomLimitOffsetPagination
from rest_framework.response import Response
from apps.notifications.serializers import NotificationsListSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter, OpenApiTypes, inline_serializer
from rest_framework import serializers
from .models import Notification

class NotificationsListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="View Notifications",
        description="Lấy danh sách thông báo của user (phân trang). Các thông báo được sắp xếp theo thời gian mới nhất trước (-created_at).",
        responses={
            200: NotificationsListSerializer(many=True),
            401: OpenApiResponse(description="Unauthorized. Authentication credentials were not provided."),
        }
    )
    def get(self, request): 
        user = request.user
        qs = Notification.objects.filter(recipient=user).select_related('actor').order_by('-created_at')

        paginator = CustomLimitOffsetPagination()
        result = paginator.paginate_queryset(qs, request)
        serializer = NotificationsListSerializer(result, many=True)
        return paginator.get_paginated_response(serializer.data)

class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark Notification as Read",
        description="Đánh dấu một thông báo cụ thể là đã đọc (is_read = True). Yêu cầu Token.",
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name="NotificationReadSuccess",
                    fields={"detail": serializers.CharField()}
                ),
                description="Notification marked as read."
            ),
            401: OpenApiResponse(description="Authentication credentials were not provided."),
            404: OpenApiResponse(description="Not found.")
        }
    )
    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
            
        return Response({"detail": "Notification marked as read."}, status=status.HTTP_200_OK)