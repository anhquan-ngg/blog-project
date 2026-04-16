from django.db import models
from django.conf import settings
from django.db.models import Index
from django.db.models import Value, TextField
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector

class Post(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts',
    )
    category = models.ForeignKey(
        'categories.Category',
        on_delete=models.CASCADE,
        blank=False,
        related_name='posts',
    )
    tags = models.ManyToManyField(
        'tags.Tag',
        through='PostTags',
        blank=True,
        related_name='posts',
    )
    title = models.CharField(max_length=200)
    content = models.JSONField()
    likes_count = models.IntegerField(default=0)
    bookmarks_count = models.IntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # tsvector for full text search
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        db_table = 'posts'
        indexes = [
            Index(fields=['author', 'created_at'], name='idx_posts_author_created'),
            Index(fields=['category', 'created_at'], name='idx_posts_category_created'),
            GinIndex(fields=['search_vector'], name='idx_posts_search_vector'),
        ]

    def __str__(self):
        return self.title

    @staticmethod
    def _extract_text_from_blocks(blocks):
        if not isinstance(blocks, list):
            return ""
        res = []
        for b in blocks:
            if isinstance(b, dict):
                data = b.get("data", {})
                if isinstance(data, dict):
                    if "text" in data:
                        res.append(str(data["text"]))
                    elif "caption" in data:
                        res.append(str(data["caption"]))
        return " ".join(res)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        content_text = self._extract_text_from_blocks(self.content)
        Post.objects.filter(pk=self.pk).update(
            search_vector=(
                SearchVector(Value(self.title, output_field=TextField()), weight="A", config="vietnamese")
                +
                SearchVector(Value(content_text, output_field=TextField()), weight="B", config="vietnamese")
            )
        )

class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'likes'
        unique_together = ('user', 'post')

    def __str__(self):
        return f'{self.user} liked {self.post}'

class Bookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

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
