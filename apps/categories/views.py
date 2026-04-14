from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework import serializers
from .serializers import CategorySerializer
from .models import Category
from apps.posts.models import Post
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, inline_serializer
from drf_spectacular.types import OpenApiTypes

class CategoryViewSet(ViewSet):
    permission_classes = [IsAdminUser]
    queryset = Category.objects.all().filter(is_deleted=False)
    serializer_class = CategorySerializer
    
    def get_permissions(self):
        if self.action == 'list':
            return []
        return super().get_permissions()

    @extend_schema(
        summary="View Categories",
        description="Returns a list of all categories including posts count. No authentication required. No pagination.",
        responses={
            200: CategorySerializer(many=True),
        }
    )
    def list(self, request):
        categories = Category.objects.all().filter(is_deleted=False)
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Create Category",
        description="Creates a new category in the system. Requires Admin privileges. Returns 201 Created.",
        request=CategorySerializer,
        responses={
            201: CategorySerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryCreateValidationError",
                    fields={
                        "name": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(
                        name="Duplicate name",
                        summary="Name already exists",
                        value={"name": ["category with this name already exists."]}
                    ),
                    OpenApiExample(
                        name="Missing name",
                        summary="Missing name field",
                        value={"name": ["This field is required."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            403: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryForbiddenError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Forbidden",
                examples=[
                    OpenApiExample(
                        name="Forbidden",
                        value={"detail": "You do not have permission to perform this action."}
                    )
                ]
            )
        }
    )
    def create(self, request):
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Update Category",
        description="Updates an existing category name. Requires Admin privileges.",
        request=CategorySerializer,
        responses={
            200: CategorySerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryUpdateValidationError",
                    fields={
                        "name": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(
                        name="Duplicate name",
                        summary="Name already exists",
                        value={"name": ["category with this name already exists."]}
                    ),
                    OpenApiExample(
                        name="Missing name",
                        summary="Missing name field",
                        value={"name": ["This field is required."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryUpdateUnauthorized",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(name="Unauthorized", value={"detail": "Authentication credentials were not provided."})
                ]
            ),
            403: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryUpdateForbidden",
                    fields={"detail": serializers.CharField()}
                ),
                description="Forbidden",
                examples=[
                    OpenApiExample(name="Forbidden", value={"detail": "You do not have permission to perform this action."})
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not Found",
                examples=[
                    OpenApiExample(name="Not Found", value={"detail": "Not found."})
                ]
            )
        }
    )
    def update(self, request, pk=None):
        category = get_object_or_404(Category, pk=pk)
        if category.is_deleted:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CategorySerializer(category, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Delete Category",
        description="Soft deletes a category. Only Admin can perform this. Cannot delete a category that currently has non-deleted posts.",
        responses={
            204: OpenApiTypes.NONE,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryDeleteValidationError",
                    fields={
                        "non_field_errors": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(
                        name="Has posts",
                        summary="Category has posts",
                        value={"non_field_errors": ["Cannot delete category 'Backend Development' because it (or its subcategories) has 28 post(s)."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryDelUnauthorized",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(name="Unauthorized", value={"detail": "Authentication credentials were not provided."})
                ]
            ),
            403: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryDelForbidden",
                    fields={"detail": serializers.CharField()}
                ),
                description="Forbidden",
                examples=[
                    OpenApiExample(name="Forbidden", value={"detail": "You do not have permission to perform this action."})
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="CategoryDelNotFound",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not Found",
                examples=[
                    OpenApiExample(name="Not Found", value={"detail": "Not found."})
                ]
            )
        }
    )
    def destroy(self, request, pk=None):
        category = get_object_or_404(Category, pk=pk)
        if category.is_deleted:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # BFS to collect the full descendant tree
        queue = [category.id]
        descendant_ids = []
        while queue:
            children_ids = list(
                Category.objects.filter(parent_id__in=queue, is_deleted=False).values_list('id', flat=True)
            )
            descendant_ids.extend(children_ids)
            queue = children_ids
        category_ids = [category.id, *descendant_ids]

        # Check if category or any subcategory has any posts
        posts_count = Post.objects.filter(category_id__in=category_ids, is_deleted=False).count()
        if posts_count > 0:
            return Response(
                {
                    "non_field_errors": [
                        f"Cannot delete category '{category.name}' because it (or its subcategories) has {posts_count} active post(s)."
                    ]
                }, status=status.HTTP_400_BAD_REQUEST)
        now = timezone.now()

        # Soft delete all descendant subcategories
        if descendant_ids:
            Category.objects.filter(id__in=descendant_ids).update(is_deleted=True, deleted_at=now)
        
        # Soft delete the category
        category.is_deleted = True
        category.deleted_at = now
        category.save()
        return Response(status=status.HTTP_204_NO_CONTENT)