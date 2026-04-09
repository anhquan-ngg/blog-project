from rest_framework import serializers
from .models import Post
from apps.categories.models import Category
from apps.tags.models import Tag
from .builder import PostBuilder
from .services import sync_post_images

class AuthorBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()

class CategoryBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()

class TagBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.SlugField()

# Post List Serializer 
class PostListSerializer(serializers.ModelSerializer):
    author = AuthorBriefSerializer()
    category = CategoryBriefSerializer()
    tags = TagBriefSerializer(many=True)
    thumbnail = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = Post 
        fields = [
            'id',
            'title',
            'thumbnail',
            'category',
            'author',
            'tags',
            'likes_count',
            'bookmarks_count',
            'is_liked',
            'is_bookmarked',
            'created_at',
        ]

    def get_thumbnail(self, obj):
        files = getattr(obj, "thumbnail_file", None)
        return files[0].file.url if files else None
    
    def get_is_liked(self, obj):
        return getattr(obj, "is_liked", False)
    
    def get_is_bookmarked(self, obj):
        return getattr(obj, "is_bookmarked", False)

class CreatePostSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    content = serializers.ListField(child=serializers.DictField(), required=True)
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    tags = serializers.PrimaryKeyRelatedField(queryset=Tag.objects.all(), many=True, required=False, default=list) 

    def create(self, validated_data):
        request = self.context.get("request")

        post = (
            PostBuilder()
            .set_author(request.user)
            .set_category(validated_data["category"])
            .set_tags(validated_data["tags"])
            .set_title(validated_data["title"])
            .set_content(validated_data["content"])
            .build()
        )

        sync_post_images(post)

        return post

class PostDetailSerializer(serializers.ModelSerializer):
    author = AuthorBriefSerializer()
    category = CategoryBriefSerializer()
    tags = TagBriefSerializer(many=True)
    content = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = Post 
        fields = [
            'id',
            'title',
            'content',
            'category',
            'author',
            'tags',
            'likes_count',
            'bookmarks_count',
            'is_liked',
            'is_bookmarked',
            'created_at',
            'updated_at'
        ]

    def get_content(self, obj):
        file_url_map = {
            pi.file_id: pi.file.url for pi in obj.post_images.all() # Prefetch image in view
        }

        content = obj.content or []
        resolved_content = []
        for block in content: 
            if block.get("type") == "image":
                data = block.get("data", {})
                file_id = data.get("file_id")
                block = {
                    **block,
                    "data": {
                        **data,
                        "url": file_url_map.get(file_id)
                    }
                }
            resolved_content.append(block)
        return resolved_content
            
    def get_is_liked(self, obj):
        return getattr(obj, "is_liked", False)
    
    def get_is_bookmarked(self, obj):
        return getattr(obj, "is_bookmarked", False)

class UpdatePostSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    content = serializers.ListField(child=serializers.DictField(), required=True)
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    tags = serializers.PrimaryKeyRelatedField(queryset=Tag.objects.all(), many=True, required=False, default=list) 

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        content_changed = "content" in validated_data

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if tags is not None:
            instance.tags.set(tags)
        
        if content_changed:
            sync_post_images(instance)
        
        return instance

class RelatedPostSerializer(serializers.ModelSerializer):
    author = AuthorBriefSerializer(read_only = True)
    category = CategoryBriefSerializer(read_only = True)
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Post 
        fields = [
            'id',
            'title',
            'thumbnail',
            'category',
            'author',
            'likes_count',
            'bookmarks_count',
            'created_at',
        ]

    def get_thumbnail(self, obj):
        files = getattr(obj, "thumbnail_file", None)
        return files[0].file.url if files else None

        
        
 
    