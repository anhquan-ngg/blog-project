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
from rest_framework import status
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes

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

    @extend_schema(responses=PostListSerializer(many=True))
    def get(self, request):
        qs = Post.objects.filter(is_deleted = False).select_related('author', 'category').prefetch_related(
            'tags',
            _thumbnail_prefetch()
        )
        
        # Filters
        category = request.query_params.get('category')
        tag = request.query_params.get('tag')
        author = request.query_params.get('author')
        sort = request.query_params.get('sort', '-created_at')
        
        if category:
            qs = qs.filter(category__id=category)
        if tag:
            qs = qs.filter(tags__slug=tag)
        if author:
            qs = qs.filter(author__id=author)

        qs = _annotate_user_actions(qs, request.user)
        qs = qs.order_by(sort)
        
        # Pagination
        paginator = CustomLimitOffsetPagination()
        paginated_qs = paginator.paginate_queryset(qs, request)
        serializer = PostListSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=CreatePostSerializer, responses=PostListSerializer)
    def post(self, request):
        serializer = CreatePostSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        return Response(PostListSerializer(post).data, status=status.HTTP_201_CREATED)

class PostRelatedView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=RelatedPostSerializer(many=True))
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

    @extend_schema(responses=PostDetailSerializer)
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

    @extend_schema(request=UpdatePostSerializer, responses=PostDetailSerializer)
    def put(self, request, pk):
        post = self._get_post(pk)
        self.check_object_permissions(request, post)

        serializer = UpdatePostSerializer(post, data=request.data, partial=False, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        return self.get(request, pk)
    
    @extend_schema(request=UpdatePostSerializer, responses=PostDetailSerializer)
    def patch(self, request, pk):
        post = self._get_post(pk)
        self.check_object_permissions(request, post)

        serializer = UpdatePostSerializer(post, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        return self.get(request, pk)
    
    @extend_schema(responses={status.HTTP_204_NO_CONTENT: OpenApiTypes.NONE})
    def delete(self, request, pk):
        from django.utils import timezone

        post = self._get_post(pk)
        self.check_object_permissions(request, post)
        post.is_deleted = True
        post.deleted_at = timezone.now()

        post.save(update_fields=['is_deleted', 'deleted_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    
        

        
        

        