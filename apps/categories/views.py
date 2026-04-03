from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from .serializers import CategorySerializer
from .models import Category
from django.shortcuts import get_object_or_404
from django.utils import timezone

class CategoryViewSet(ViewSet):
    permission_classes = [IsAdminUser]
    
    def get_permissions(self):
        if self.action == 'list':
            return []
        return super().get_permissions()

    def list(self, request):
        categories = Category.objects.all().filter(is_deleted=False)
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def create(self, request):
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, pk=None):
        category = get_object_or_404(Category, pk=pk)
        if category.is_deleted:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CategorySerializer(category, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, pk=None):
        category = get_object_or_404(Category, pk=pk)
        if category.is_deleted:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if category has any posts
        posts_count = category.post.filter(is_deleted=False).count()
        if posts_count > 0:
            return Response(
                {
                    "non_field_errors": [
                        f"Cannot delete category '{category.name}' because it has {posts_count} post(s)."
                    ]
                }, status=status.HTTP_400_BAD_REQUEST)
        now = timezone.now()

        # Soft delete all subcategories
        Category.objects.filter(parent_id=category.id).update(is_deleted=True, deleted_at=now)
        
        # Soft delete the category
        category.is_deleted = True
        category.deleted_at = now
        category.save()
        return Response(status=status.HTTP_204_NO_CONTENT)