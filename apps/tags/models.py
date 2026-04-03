from django.db import models
from django.db.models import Index

class Tag(models.Model):
    name = models.CharField(max_length = 50, unique = True, null = False, blank = False)
    slug = models.SlugField(max_length = 50, unique = True, null = False, blank = True)
    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

    class Meta:
        db_table = 'tags'
        ordering = ['name']
        indexes = [
            Index(fields=['slug'], name='idx_tags_slug'),
        ]

    def __str__(self):
        return self.name
