from drf_spectacular.utils import (
    extend_schema, OpenApiExample, OpenApiResponse,
    OpenApiParameter, OpenApiTypes
)
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, UpdateAPIView, DestroyAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.generics import get_object_or_404
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.exceptions import PermissionDenied
from django.db.models import Prefetch
from django.utils import timezone
from .models import Comment
from .serializers import CommentSerializer, CreateCommentSerializer, UpdateCommentSerializer
from apps.posts.models import Post
from core.permissions import IsAuthorOnly, IsAuthorOrAdmin
from django.db.models import Subquery, OuterRef
from apps.files.models import File, FileStatus


class CommentPagination(LimitOffsetPagination):
    default_limit = 20
    max_limit = 100


class CommentListCreateAPIView(ListCreateAPIView):
    serializer_class = CommentSerializer
    pagination_class = CommentPagination

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]

    def _get_post(self):
        return get_object_or_404(Post, pk=self.kwargs.get('pk'), is_deleted=False)

    def get_queryset(self):
        post = self._get_post()
        
        file_sq = File.objects.filter(
            entity_type='comment',
            entity_id=OuterRef('pk'),
            status=FileStatus.ACTIVE
        ).values('url')[:1]

        replies_qs = Comment.objects.filter(
            is_deleted=False
        ).select_related('author').annotate(
            image_url_annotated=Subquery(file_sq)
        ).order_by('created_at')

        return (
            Comment.objects.filter(
                post=post,
                parent_id__isnull=True,
                is_deleted=False,
            )
            .select_related('author')
            .annotate(image_url_annotated=Subquery(file_sq))
            .prefetch_related(Prefetch('replies', queryset=replies_qs))
            .order_by('created_at')
        )

    @extend_schema(
        summary="View Comments",
        description=(
            "Returns a list of top-level comments for the post, with nested replies. "
            "No authentication required. Paginated by limit/offset."
        ),
        parameters=[
            OpenApiParameter("limit", OpenApiTypes.INT, description="Số comment mỗi trang (default 20, max 100)"),
            OpenApiParameter("offset", OpenApiTypes.INT, description="Số comment bỏ qua (default 0)"),
        ],
        responses={
            200: CommentSerializer(many=True),
            404: OpenApiResponse(description="Post not found"),
        },
    )
    def get(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create Comment",
        description=(
            "Create a new comment for the post. Supports replies (pass `parent_id`) "
            "and attach images (`file_id`). Requires authentication."
        ),
        request=CreateCommentSerializer,
        responses={
            201: CommentSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Unauthorized"),
            404: OpenApiResponse(description="Post not found"),
        },
        examples=[
            OpenApiExample(
                name="Top-level comment",
                summary="Top-level comment",
                value={"content": "This is a great explanation!", "file_id": None, "parent_id": None},
                request_only=True,
            ),
            OpenApiExample(
                name="Reply (Level 2)",
                summary="Reply to a comment",
                value={"content": "Totally agree with you!", "parent_id": 5},
                request_only=True,
            ),
        ]
    )
    def post(self, request, *args, **kwargs):
        post = self._get_post()
        serializer = CreateCommentSerializer(
            data=request.data,
            context={'request': request, 'post_id': post.pk}
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(post=post, author=request.user)

        # Trả về full response với CommentSerializer (kèm author, replies, image_url)
        output = CommentSerializer(comment, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)


class CommentUpdateDeleteAPIView(UpdateAPIView, DestroyAPIView):
    queryset = Comment.objects.all()
    serializer_class = UpdateCommentSerializer
    
    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT']:
            return [IsAuthenticated(), IsAuthorOnly()]
        elif self.request.method == 'DELETE':
            return [IsAuthenticated(), IsAuthorOrAdmin()]
        return [IsAuthenticated()]

    def get_object(self):
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get('pk'), is_deleted=False)
        self.check_object_permissions(self.request, obj)
        return obj

    @extend_schema(
        summary="Update Comment",
        description="Update comment content or change/remove attached image. Only author can do this.",
        request=UpdateCommentSerializer,
        responses={
            200: CommentSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Unauthorized"),
            403: OpenApiResponse(description="Forbidden"),
            404: OpenApiResponse(description="Not found"),
        },
        examples=[
            OpenApiExample(
                name="Update comment",
                value={"content": "Updated comment content.", "file_id": 100},
                request_only=True,
            )
        ]
    )
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @extend_schema(exclude=True)
    def put(self, request, *args, **kwargs):
        # We only want to support PATCH based on design docs
        return Response({"detail": "Method \"PUT\" not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def perform_update(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full Comment data
        instance.refresh_from_db()
        output = CommentSerializer(instance, context={'request': request})
        return Response(output.data)

    @extend_schema(
        summary="Delete Comment",
        description="Soft delete a comment (set is_deleted=True). Owner or Admin only.",
        responses={
            204: OpenApiResponse(description="No Content"),
            401: OpenApiResponse(description="Unauthorized"),
            403: OpenApiResponse(description="Forbidden"),
            404: OpenApiResponse(description="Not found"),
        }
    )
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at"])
        
        # Xoá rác Notification
        from apps.notifications.models import Notification
        Notification.objects.filter(
            target_id=instance.id,
            target_type='comment'
        ).delete()
