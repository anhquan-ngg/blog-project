from django.db import models
from django.conf import settings
from django.db.models import Index

class Post(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts',
    )
    category = models.ForeignKey(
        'categories.Category',
        on_delete=models.CASCADE,
        blank=True,
        related_name='posts',
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    likes_count = models.IntegerField(default=0)
    bookmarks_count = models.IntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'posts'
        indexes = [
            Index(fields=['author', 'created_at'], name='idx_posts_author_created'),
            Index(fields=['category', 'created_at'], name='idx_posts_category_created'),
        ]

    def __str__(self):
        return self.title

class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')

    class Meta:
        db_table = 'likes'
        unique_together = ('user', 'post')

    def __str__(self):
        return f'{self.user} liked {self.post}'

class Bookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='bookmarks')

    class Meta:
        db_table = 'bookmarks'
        unique_together = ('user', 'post')

    def __str__(self):
        return f'{self.user} bookmarked {self.post}'

class PostImages(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_images')
    file = models.ForeignKey('files.File', on_delete=models.CASCADE, related_name='post_images')
    caption = models.CharField(max_length=200, null=True, blank=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'post_images'
        ordering = ['order']
        indexes = [
            Index(fields=['post_id'], name='idx_post_images_post_id'),
        ]

    def __str__(self):
        return f'{self.post} image'

class PostTags(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_tags')
    tag = models.ForeignKey('tags.Tag', on_delete=models.CASCADE, related_name='post_tags')

    class Meta:
        db_table = 'post_tags'
        unique_together = ('post', 'tag')
        indexes = [
            Index(fields=['tag_id'], name='idx_post_tags_tag_id'),
        ]

    def __str__(self):
        return f'{self.post} tagged with {self.tag}'
