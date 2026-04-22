from django.db import models
from django.db.models import Index
from django.utils.text import slugify

class Category(models.Model): 
    parent_id = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, db_column="parent_id")
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank = True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categories'
        indexes = [
            Index(fields=['parent_id'], name='idx_categories_parent_id'),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto generate slug from name (if name is changed, slug will be updated)
        self.slug = slugify(self.name)
        super().save(*args, **kwargs)