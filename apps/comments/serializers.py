from rest_framework import serializers
from django.db import transaction
from .models import Comment
from apps.files.models import File, FileStatus
from apps.comments.services import attach_file_to_comment, detach_file_from_comment

# ── Author brief ──────────────────────────────────────────────────────────────
class CommentAuthorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


# ── Reply serializer (cấp 2 — không có nested replies tiếp) ──────────────────
class ReplySerializer(serializers.ModelSerializer):
    author = CommentAuthorSerializer()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'content', 'author', 'image_url', 'created_at', 'updated_at']

    def get_image_url(self, obj) -> str | None:
        if hasattr(obj, 'image_url_annotated'):
            return getattr(obj, 'image_url_annotated')
            
        file = File.objects.filter(
            entity_type='comment', entity_id=obj.id, status=FileStatus.ACTIVE
        ).first()
        return file.url if file else None


# ── Comment serializer (cấp 1 — kèm replies lồng trong) ─────────────────────
class CommentSerializer(serializers.ModelSerializer):
    author = CommentAuthorSerializer()
    replies = ReplySerializer(many=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'content', 'author', 'image_url', 'replies', 'created_at', 'updated_at']

    def get_image_url(self, obj) -> str | None:
        if hasattr(obj, 'image_url_annotated'):
            return getattr(obj, 'image_url_annotated')
        
        # Ensure fresh data by triggering a fallback query via refresh_from_db() after update
        file = File.objects.filter(
            entity_type='comment', entity_id=obj.id, status=FileStatus.ACTIVE
        ).first()
        return file.url if file else None


# ── Create input serializer ───────────────────────────────────────────────────
class CreateCommentSerializer(serializers.Serializer):
    content = serializers.CharField()
    file_id = serializers.IntegerField(required=False, allow_null=True)
    parent_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_file_id(self, value):
        if value is not None and not File.objects.filter(pk=value, status=FileStatus.ACTIVE).exists():
            raise serializers.ValidationError("File not found.")
        return value

    def validate_parent_id(self, value):
        if value is None:
            return value
        parent_qs = Comment.objects.filter(pk=value, is_deleted=False)
        if not parent_qs.exists():
            raise serializers.ValidationError("Comment not found.")
        parent = parent_qs.first()
        if parent.parent is not None:
            raise serializers.ValidationError("Comment is a reply. Cannot nest deeper than level 2.")
        post_id = self.context.get('post_id')
        if post_id and parent.post_id != post_id:
            raise serializers.ValidationError("Comment does not belong to this post.")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            file_id = validated_data.pop('file_id', None)
            comment = Comment.objects.create(**validated_data)
            if file_id:
                attach_file_to_comment(file_id, comment)
        return comment

# ── Update input serializer ───────────────────────────────────────────────────
class UpdateCommentSerializer(serializers.Serializer):
    content = serializers.CharField(required=False)
    file_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_file_id(self, value):
        if value is not None and not File.objects.filter(pk=value, status=FileStatus.ACTIVE).exists():
            raise serializers.ValidationError("File not found.")
        return value

    def update(self, instance, validated_data):
        save_fields = ['updated_at']
        if 'content' in validated_data:
            instance.content = validated_data['content']
            save_fields.append('content')

        if 'file_id' in validated_data:
            new_file_id = validated_data['file_id']
            # Detach old file from comment
            detach_file_from_comment(instance)
            # Link new file to comment
            if new_file_id is not None:
                attach_file_to_comment(new_file_id, instance)
            save_fields.append('file_id')
        
        if len(save_fields) > 1 or 'file_id' in validated_data:
            instance.save(update_fields=save_fields)

        return instance