from rest_framework import serializers
from .models import Category

class CategorySerializer(serializers.ModelSerializer):
    parent_id = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), allow_null=True, required=False)
    posts_count = serializers.SerializerMethodField()
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'posts_count', 'parent_id', 'created_at']
        read_only_fields = ['id', 'posts_count', 'created_at']

    def validate_name(self, value: str) -> str:
        if Category.objects.filter(name = value, is_deleted = False).exists():
            raise serializers.ValidationError("Category with this name already exists.")
        return value

    def get_posts_count(self, obj: Category) -> int:
        return obj.posts.filter(is_deleted=False).count()
    
    