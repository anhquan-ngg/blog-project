from apps.posts.serializers import PostBookmarkSerializer
from apps.posts.serializers import PostLikeSerializer
from apps.posts.serializers import RelatedPostSerializer
from apps.posts.serializers import UpdatePostSerializer
from rest_framework.generics import get_object_or_404
from apps.posts.serializers import PostDetailSerializer
from rest_framework.views import APIView
from django.db.models import Prefetch, Exists, OuterRef
from core.pagination import CustomLimitOffsetPagination
from core.permissions import IsAuthorOrAdmin, IsAuthorOnly
from apps.files.models import File
from apps.posts.models import Post, Bookmark, Like, PostImages
from apps.posts.serializers import PostListSerializer, CreatePostSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, exceptions
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, inline_serializer, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers
from django.db.models import F
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from apps.posts.serializers import TagBriefSerializer
from apps.tags.models import Tag

def _thumbnail_prefetch():
    return Prefetch(
        'post_images',
        queryset=PostImages.objects.select_related('file').filter(file__status='active').order_by('order'),
        to_attr='thumbnail_file'
    )

def _annotate_user_actions(qs, user):
    if user.is_authenticated:
        qs = qs.annotate(
            is_liked=Exists(Like.objects.filter(post=OuterRef('pk'), user=user)),
            is_bookmarked=Exists(Bookmark.objects.filter(post=OuterRef('pk'), user=user)),
        )
    return qs

class PostListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]

    @extend_schema(
        summary="View Posts",
        description="Returns a list of posts with like and bookmark counts. Authentication not required. Supports filtering by category, author, tag, and ordering.",
        parameters=[
            OpenApiParameter("category", OpenApiTypes.INT, description="Filter by category_id"),
            OpenApiParameter("author", OpenApiTypes.INT, description="Filter by author_id"),
            OpenApiParameter("tag", OpenApiTypes.STR, description="Filter by tag slug"),
            OpenApiParameter("ordering", OpenApiTypes.STR, description="Sort by: created_at, -created_at, likes_count, -likes_count, bookmarks_count, -bookmarks_count", default="-created_at"),
            OpenApiParameter("limit", OpenApiTypes.INT, description="Number of items per page", default=10),
            OpenApiParameter("offset", OpenApiTypes.INT, description="Number of items to skip", default=0),
        ],
        responses={
            200: PostListSerializer(many=True),
            400: OpenApiResponse(
                description="Validation error",
                response=inline_serializer(
                    name="PostListValidationError",
                    fields={
                        "category": serializers.ListField(child=serializers.CharField(), required=False),
                        "author": serializers.ListField(child=serializers.CharField(), required=False),
                        "ordering": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                examples=[
                    OpenApiExample(name="Invalid category", value={"category": ["category must be an integer."]}),
                    OpenApiExample(name="Invalid author", value={"author": ["author must be an integer."]}),
                    OpenApiExample(name="Invalid ordering", value={"ordering": ["Invalid ordering. Allowed values are: created_at, -created_at, likes_count, -likes_count, bookmarks_count, -bookmarks_count"]})
                ]
            ),
        }
    )
    def get(self, request):
        qs = Post.objects.filter(is_deleted = False).select_related('author', 'category').prefetch_related(
            'tags',
            _thumbnail_prefetch()
        )
        
        # Filters
        category = request.query_params.get('category')
        tag = request.query_params.get('tag')
        author = request.query_params.get('author')
        ordering = request.query_params.get('ordering', request.query_params.get('sort', '-created_at'))
        
        ALLOWED_ORDERING = ['created_at', '-created_at', 'likes_count', '-likes_count', 'bookmarks_count', '-bookmarks_count']

        if category:
            try:
                category = int(category)
            except ValueError:
                return Response({"category": ["category must be an integer."]}, status=status.HTTP_400_BAD_REQUEST)
            from apps.categories.models import Category
            if not Category.objects.filter(id=category, is_deleted=False).exists():
                return Response({"category": [f"Category with id {category} does not exist."]}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(category__id=category)
            
        if tag:
            qs = qs.filter(tags__slug=tag)
            
        if author:
            try:
                author = int(author)
            except ValueError:
                return Response({"author": ["author must be an integer."]}, status=status.HTTP_400_BAD_REQUEST)
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if not User.objects.filter(id=author).exists():
                return Response({"author": [f"User with id {author} does not exist."]}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(author__id=author)

        if ordering and ordering not in ALLOWED_ORDERING:
            return Response({"ordering": [f"Invalid ordering. Allowed values are: {', '.join(ALLOWED_ORDERING)}"]}, status=status.HTTP_400_BAD_REQUEST)

        qs = qs.order_by(ordering)
        qs = _annotate_user_actions(qs, request.user)
        
        # Pagination
        paginator = CustomLimitOffsetPagination()
        paginated_qs = paginator.paginate_queryset(qs, request)
        serializer = PostListSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Create Post",
        description="Create a new post. The author is automatically assigned from the logged-in user.",
        request=CreatePostSerializer,
        responses={
            201: PostListSerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="PostCreateValidationError",
                    fields={"title": serializers.ListField(child=serializers.CharField())}
                ),
                description="Validation error",
                examples=[
                    OpenApiExample(name="Validation Error", value={"title": ["This field is required."]})
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="PostCreateUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(name="Unauthorized", value={"detail": "Authentication credentials were not provided."})
                ]
            )
        }
    )
    def post(self, request):
        serializer = CreatePostSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        return Response(PostListSerializer(post).data, status=status.HTTP_201_CREATED)

class PostRelatedView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="View Related Posts",
        description="Returns a list of posts in the same category as the current post, excluding the current post itself. Ordered by likes count descending.",
        parameters=[
            OpenApiParameter("limit", OpenApiTypes.INT, description="Number of related posts to return (4-10)", default=4)
        ],
        responses={
            200: RelatedPostSerializer(many=True),
            400: OpenApiResponse(
                response=inline_serializer(
                    name="RelatedPostLimitError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Invalid limit",
                examples=[
                    OpenApiExample(name="Limit error", value={"detail": "limit must be an integer, from 4 to 10"})
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="RelatedPostNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Post not found",
                examples=[
                    OpenApiExample(name="Not found", value={"detail": "Not found."})
                ]
            )
        }
    )
    def get(self, request, pk):
        post = get_object_or_404(Post, pk=pk, is_deleted=False)

        try:
            limit = int(request.query_params.get('limit', 4))
            if not (4 <= limit <= 10):
                raise ValueError()
        except ValueError:
            return Response({
                "detail": "limit must be an integer, from 4 to 10"
            }, status=status.HTTP_400_BAD_REQUEST)

        related_qs = (
            Post.objects.filter(category=post.category, is_deleted=False).
            exclude(pk=post.pk).
            select_related('author', 'category').
            prefetch_related(_thumbnail_prefetch()).
            order_by("-likes_count")[:limit]
        )

        serializer = RelatedPostSerializer(related_qs, many=True)
        return Response(serializer.data)


class PostDetailUpdateDeleteView(APIView):
    def get_permissions(self):
        if (self.request.method == 'GET'):
            return [AllowAny()]
        elif (self.request.method == 'DELETE'):
            return [IsAuthenticated(), IsAuthorOrAdmin()]
        # PUT, PATCH
        return [IsAuthenticated(), IsAuthorOnly()]
    
    def _get_post(self, pk): 
        return get_object_or_404(Post, pk=pk, is_deleted=False)

    @extend_schema(
        summary="View Post Detail",
        description="Returns the full details of a post by ID. Includes resolving image URLs within the content blocks.",
        responses={
            200: PostDetailSerializer,
            404: OpenApiResponse(
                response=inline_serializer(
                    name="PostDetailNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not found",
                examples=[
                    OpenApiExample(name="Not found", value={"detail": "Not found."})
                ]
            )
        }
    )
    def get(self, request, pk):
        qs = Post.objects.filter(pk = pk, is_deleted = False).select_related('author', 'category').prefetch_related(
            'tags',
            Prefetch(
                'post_images',
                queryset=PostImages.objects.select_related('file').filter(file__status='active').order_by('order')
            )
        )

        qs = _annotate_user_actions(qs, request.user)
        post = get_object_or_404(qs)
        serializer = PostDetailSerializer(post)
        return Response(serializer.data)

    @extend_schema(
        summary="Update Post (Full)",
        description="Updates all fields of an existing post. Only the author of the post can perform this action.",
        request=UpdatePostSerializer,
        responses={
            200: PostDetailSerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="PostUpdateValidationError",
                    fields={"title": serializers.ListField(child=serializers.CharField())}
                ),
                description="Validation error",
                examples=[
                    OpenApiExample(name="Validation error", value={"title": ["This field is required."]})
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="PostUpdateUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(name="Unauthorized", value={"detail": "Authentication credentials were not provided."})
                ]
            ),
            403: OpenApiResponse(
                response=inline_serializer(
                    name="PostUpdateForbiddenError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Forbidden",
                examples=[
                    OpenApiExample(name="Forbidden", value={"detail": "You do not have permission to perform this action."})
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="PostUpdateNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not found",
                examples=[
                    OpenApiExample(name="Not found", value={"detail": "Not found."})
                ]
            )
        }
    )
    def put(self, request, pk):
        post = self._get_post(pk)
        self.check_object_permissions(request, post)

        serializer = UpdatePostSerializer(post, data=request.data, partial=False, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        return self.get(request, pk)
    
    @extend_schema(
        summary="Update Post (Partial)",
        description="Updates specific fields of an existing post. Only the author of the post can perform this action.",
        request=UpdatePostSerializer,
        responses={
            200: PostDetailSerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="PostPartialUpdateValidationError",
                    fields={"title": serializers.ListField(child=serializers.CharField())}
                ),
                description="Validation error",
                examples=[
                    OpenApiExample(name="Validation error", value={"title": ["This field is required."]})
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="PostPartialUpdateUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(name="Unauthorized", value={"detail": "Authentication credentials were not provided."})
                ]
            ),
            403: OpenApiResponse(
                response=inline_serializer(
                    name="PostPartialUpdateForbiddenError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Forbidden",
                examples=[
                    OpenApiExample(name="Forbidden", value={"detail": "You do not have permission to perform this action."})
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="PostPartialUpdateNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not found",
                examples=[
                    OpenApiExample(name="Not found", value={"detail": "Not found."})
                ]
            )
        }
    )
    def patch(self, request, pk):
        post = self._get_post(pk)
        self.check_object_permissions(request, post)

        serializer = UpdatePostSerializer(post, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        return self.get(request, pk)
    
    @extend_schema(
        summary="Delete Post",
        description="Soft deletes a post by setting is_deleted to True. Only the author or an Admin can perform this action.",
        responses={
            204: OpenApiTypes.NONE,
            401: OpenApiResponse(
                response=inline_serializer(
                    name="PostDeleteUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(name="Unauthorized", value={"detail": "Authentication credentials were not provided."})
                ]
            ),
            403: OpenApiResponse(
                response=inline_serializer(
                    name="PostDeleteForbiddenError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Forbidden",
                examples=[
                    OpenApiExample(name="Forbidden", value={"detail": "You do not have permission to perform this action."})
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="PostDeleteNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not found",
                examples=[
                    OpenApiExample(name="Not found", value={"detail": "Not found."})
                ]
            )
        }
    )
    def delete(self, request, pk):
        from django.utils import timezone
        from apps.notifications.models import Notification

        post = self._get_post(pk)
        self.check_object_permissions(request, post)
        post.is_deleted = True
        post.deleted_at = timezone.now()

        post.save(update_fields=['is_deleted', 'deleted_at'])
        
        # Xoá rác Notification liên quan đến post (Ví dụ: thông báo người khác đã comment vào bài, hoặc like bài này)
        Notification.objects.filter(
            target_id=post.id,
            target_type='post'
        ).delete()

        # Xoá notifications của các comments thuộc post này
        from apps.comments.models import Comment
        comment_ids = Comment.objects.filter(post=post).values_list('id', flat=True)
        if comment_ids:
            Notification.objects.filter(
                target_id__in=list(comment_ids),
                target_type='comment'
            ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class PostSearchView(APIView):
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="Search Posts",
        description="Full-text search for Vietnamese posts using keyword 'q'. Supports filtering by category.",
        parameters=[
            OpenApiParameter("q", OpenApiTypes.STR, required=True, description="Search keyword (minimum 2 characters)"),
            OpenApiParameter("category", OpenApiTypes.INT, description="Filter search within category_id"),
            OpenApiParameter("limit", OpenApiTypes.INT, description="Number of items per page", default=10),
            OpenApiParameter("offset", OpenApiTypes.INT, description="Number of items to skip", default=0),
        ],
        responses={
            200: PostListSerializer(many=True),
            400: OpenApiResponse(
                response=inline_serializer(
                    name="PostSearchValidationError",
                    fields={
                        "q": serializers.ListField(child=serializers.CharField(), required=False),
                        "category": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(name="Missing q", value={"q": ["This field is required."]}),
                    OpenApiExample(name="Too short q", value={"q": ["Search query must be at least 2 characters."]}),
                    OpenApiExample(name="Invalid category", value={"category": ["category must be an integer."]})
                ]
            )
        }
    )
    def get(self, request):
        q = request.query_params.get('q', '').strip()
        
        if not q:
            return Response({"q": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if len(q) < 2:
            return Response({"q": ["Search query must be at least 2 characters."]}, status=status.HTTP_400_BAD_REQUEST)
        
        category_id = request.query_params.get('category')
        
        if category_id:
            try:
                category_id = int(category_id)
            except ValueError:
                return Response({"category": ["category must be an integer."]}, status=status.HTTP_400_BAD_REQUEST)
            from apps.categories.models import Category
            if not Category.objects.filter(id=category_id, is_deleted=False).exists():
                return Response({"category": [f"Category with id {category_id} does not exist."]}, status=status.HTTP_400_BAD_REQUEST)
        
        qs = Post.objects.filter(is_deleted=False).select_related('author', 'category').prefetch_related(
            'tags',
            _thumbnail_prefetch()
        )
        
        query = SearchQuery(q, config='vietnamese')
        
        qs = qs.annotate(
            rank=SearchRank(F('search_vector'), query)
        ).filter(search_vector=query).order_by('-rank', '-created_at')
        
        if category_id:
            qs = qs.filter(category_id=category_id)
            
        qs = _annotate_user_actions(qs, request.user)
            
        paginator = CustomLimitOffsetPagination()
        paginated_qs = paginator.paginate_queryset(qs, request)
        serializer = PostListSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class PostLikeView(APIView):
    serializer_class = PostLikeSerializer
    permission_classes = [IsAuthenticated]

    def _get_post(self, pk):
        try:
            return Post.objects.get(pk=pk, is_deleted=False)
        except Post.DoesNotExist:
            raise exceptions.NotFound("Not found.") from None

    @extend_schema(
        summary="Like Post",
        description="Likes a post. If the user has already liked the post, it will be unliked.",
        responses={
            200: PostLikeSerializer,
            401: OpenApiResponse(
                response=inline_serializer(
                    name="PostLikeUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(name="Unauthorized", value={"detail": "Authentication credentials were not provided."})
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="PostLikeNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not found",
                examples=[
                    OpenApiExample(name="Not found", value={"detail": "Not found."})
                ]
            )
        }
    )
    def post(self, request, pk):
        post = self._get_post(pk)
        serializer = self.serializer_class(context={"request": request, "post": post})
        result = serializer.toggle_like()
        return Response(result)

class PostBookmarkView(APIView):
    serializer_class = PostBookmarkSerializer
    permission_classes = [IsAuthenticated]

    def _get_post(self, pk):
        try:
            return Post.objects.get(pk=pk, is_deleted=False)
        except Post.DoesNotExist:
            raise exceptions.NotFound("Not found.") from None

    @extend_schema(
        summary="Bookmark Post",
        description="Bookmarks a post. If the user has already bookmarked the post, it will be unbookmarked.",
        responses={
            200: PostBookmarkSerializer,
            401: OpenApiResponse(
                response=inline_serializer(
                    name="PostBookmarkUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(name="Unauthorized", value={"detail": "Authentication credentials were not provided."})
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="PostBookmarkNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not found",
                examples=[
                    OpenApiExample(name="Not found", value={"detail": "Not found."})
                ]
            )
        }
    )
    def post(self, request, pk):
        post = self._get_post(pk)
        serializer = self.serializer_class(context={"request": request, "post": post})
        result = serializer.toggle_bookmark()
        return Response(result)