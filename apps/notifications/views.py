from core.pagination import CustomLimitOffsetPagination
from rest_framework.response import Response
from apps.notifications.serializers import NotificationsListSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter, OpenApiTypes, inline_serializer, OpenApiExample
from rest_framework import serializers
from .models import Notification

class NotificationsListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="View Notifications",
        description="Lấy danh sách thông báo của user (phân trang). Các thông báo được sắp xếp theo thời gian mới nhất trước (-created_at).",
        parameters=[
            OpenApiParameter(
                name="limit",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="Number of results to return per page.",
                required=False
            ),
            OpenApiParameter(
                name="offset",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="The initial index from which to return the results.",
                required=False
            )
        ],
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name="NotificationsPaginatedResponse",
                    fields={
                        "count": serializers.IntegerField(),
                        "next": serializers.URLField(allow_null=True),
                        "previous": serializers.URLField(allow_null=True),
                        "results": NotificationsListSerializer(many=True)
                    }
                ),
                description="Paginated list of notifications",
                examples=[
                    OpenApiExample(
                        name="Success Example",
                        summary="Paginated response",
                        value={
                            "count": 2,
                            "next": None,
                            "previous": None,
                            "results": [
                                {
                                    "id": 42,
                                    "type": "liked_post",
                                    "target_id": 105,
                                    "target_type": "post",
                                    "actor_username": "janedoe",
                                    "is_read": False,
                                    "created_at": "2026-04-14T10:00:00Z"
                                },
                                {
                                    "id": 41,
                                    "type": "commented_post",
                                    "target_id": 78,
                                    "target_type": "comment",
                                    "actor_username": "bobsmith",
                                    "is_read": True,
                                    "created_at": "2026-04-13T15:30:00Z"
                                }
                            ]
                        }
                    )
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="NotificationListUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized.",
                examples=[
                    OpenApiExample(
                        name="Unauthorized Example",
                        summary="Authentication credentials were not provided.",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
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
                description="Notification marked as read.",
                examples=[
                    OpenApiExample(
                        name="Success Example",
                        summary="Notification marked as read.",
                        value={"detail": "Notification marked as read."}
                    )
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="NotificationMarkReadUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized.",
                examples=[
                    OpenApiExample(
                        name="Unauthorized Example",
                        summary="Authentication credentials were not provided.",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="NotificationMarkReadNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not found.",
                examples=[
                    OpenApiExample(
                        name="Not Found Example",
                        summary="Notification not found.",
                        value={"detail": "Not found."}
                    )
                ]
            )
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
