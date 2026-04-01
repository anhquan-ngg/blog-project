from django.db import models
from django.conf import settings
from django.db.models import Index

class Comment(models.Model):
    post = models.ForeignKey('posts.Post', on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    parent= models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField()
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'comments'
        indexes = [
            Index(fields=['post_id'], name='idx_comments_post_id'),
            Index(fields=['author_id'], name='idx_comments_author_id'),
            Index(fields=['parent_id'], name='idx_comments_parent_id'),
        ]

