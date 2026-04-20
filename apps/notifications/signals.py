from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from apps.posts.models import Like, Post
from apps.comments.models import Comment
from apps.notifications.models import Notification, NotificationType

@receiver(post_save, sender=Like)
def create_like_notification(sender, instance, created, **kwargs):
    if not created:
        return
    
    actor_id = instance.user_id
    
    # Dùng list values để tránh load nguyên object Post
    recipient_id = Post.objects.filter(id=instance.post_id).values_list('author_id', flat=True).first()
    
    if not recipient_id or actor_id == recipient_id:
        return
        
    transaction.on_commit(lambda: Notification.objects.create(
        recipient_id=recipient_id,
        actor_id=actor_id,
        type=NotificationType.LIKED_POST,
        target_id=instance.post_id,
        target_type='post'
    ))

@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    if not created:
        return
        
    actor_id = instance.author_id
    
    if not instance.parent_id:
        # Event: Comment Post
        recipient_id = Post.objects.filter(id=instance.post_id).values_list('author_id', flat=True).first()
        notification_type = NotificationType.COMMENTED_POST
    else:
        # Event: Reply Comment
        recipient_id = Comment.objects.filter(id=instance.parent_id).values_list('author_id', flat=True).first()
        notification_type = NotificationType.REPLIED_COMMENT
        
    if not recipient_id or actor_id == recipient_id:
        return
        
    transaction.on_commit(lambda: Notification.objects.create(
        recipient_id=recipient_id,
        actor_id=actor_id,
        type=notification_type,
        target_id=instance.id,
        target_type='comment'
    ))
