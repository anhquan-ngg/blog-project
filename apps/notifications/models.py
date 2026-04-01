from django.db import models
from django.conf import settings
from django.db.models import Index

class NotificationType(models.TextChoices):
    LIKED_POST = 'liked_post'
    COMMENTED_POST = 'commented_post'
    REPLIED_COMMENT = 'replied_comment'

class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications_sent')
    type = models.CharField(max_length=20, choices=NotificationType.choices)
    target_id = models.IntegerField(null = False)
    target_type = models.CharField(max_length=50, null = False)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        indexes = [
            Index(fields = ['recipient_id', 'is_read'], name = 'idx_noti_reci_is_read'),
            Index(fields = ['recipient_id', 'created_at'], name = 'idx_not_reci_created_at'),
        ]
        

    def __str__(self):
        return f'{self.actor} {self.type} {self.recipient}'
    
    
    
    
