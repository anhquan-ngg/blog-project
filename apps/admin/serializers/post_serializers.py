from rest_framework import serializers
from apps.posts.models import Post
from apps.categories.models import Category

MAX_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_FORMATS = {"text/csv"}


class ImportPostFromCSVSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, file):
        if file.content_type not in ALLOWED_FORMATS or not file.name.lower().endswith(".csv"):
            raise serializers.ValidationError("Only CSV files are accepted.")
        if file.size > MAX_SIZE_BYTES:
            raise serializers.ValidationError("File size must not exceed 10MB.")
        return file


class PostCSVRowSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=True)
    content = serializers.CharField(required=True)
    category_name = serializers.CharField(required=True)

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value

    def validate_category_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("This field may not be blank.")
        return name

    def create(self, validated_data):
        author = self.context["author"]
        category, _ = Category.objects.filter(is_deleted=False).get_or_create(name=validated_data["category_name"])
        # Normalize CSV text into the same JSON block shape used by editor content.
        content_json = [{"type": "paragraph", "data": {"text": validated_data["content"]}}]
        return Post.objects.create(
            title=validated_data["title"],
            content=content_json,
            category=category,  
            author=author,
            is_deleted=False,
        )

class ExportPostToCSVSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField(max_length=200)
    content = serializers.SerializerMethodField()
    author_username = serializers.CharField(source='author.username')
    category_name = serializers.CharField(source='category.name')
    tags = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField()
    bookmarks_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()

    def get_tags(self, obj):
        return ", ".join([tag.name for tag in obj.tags.all()])
    
    def get_content(self, obj) -> list:
        file_url_map = {
            pi.file_id: pi.file.url for pi in obj.post_images.all() # Prefetch image in view
        }

        content = obj.content or []
        resolved_content = []
        for block in content: 
            if block.get("type") == "image":
                data = block.get("data", {})
                file_id = data.get("file_id")
                rest_data = {k: v for k, v in data.items() if k != "file_id"}
                block = {
                    **block,
                    "data": {
                        **rest_data,
                        "url": file_url_map.get(file_id)
                    }
                }
            resolved_content.append(block)
        return resolved_content