from rest_framework import serializers
from .models import Notification
from apps.comments.models import Comment

class NotificationsListSerializerBase(serializers.ListSerializer):
    def to_representation(self, data):
        comment_ids = [item.target_id for item in data if item.target_type == 'comment']
        if comment_ids:
            comments = Comment.objects.filter(id__in=comment_ids).values_list('id', 'post_id')
            self.child.context['_comment_post_ids'] = dict(comments)
        else:
            self.child.context['_comment_post_ids'] = {}
        return super().to_representation(data)


class NotificationsListSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    post_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        list_serializer_class = NotificationsListSerializerBase
        fields = ['id', 'type', 'target_id', 'target_type', 'actor_username', 'post_id', 'is_read', 'created_at']
        read_only_fields = ['id', 'actor_username', 'is_read', 'created_at']

    def get_post_id(self, obj):
        if obj.target_type == 'post':
            return obj.target_id
        if obj.target_type == 'comment':
            # Check context to avoid N+1 queries
            if '_comment_post_ids' in self.context:
                return self.context['_comment_post_ids'].get(obj.target_id)
            # Fallback for single object serialization
            post_id = Comment.objects.filter(id=obj.target_id).values_list('post_id', flat=True).first()
            return post_id
        return None
