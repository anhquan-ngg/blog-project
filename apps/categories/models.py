from django.db import models
from django.db.models import Index
from django.utils.text import slugify

class Category(models.Model): 
    parent_id = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, db_column="parent_id")
    name = models.CharField(max_length=100)
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
        constraints = [
            models.UniqueConstraint(fields=['parent_id', 'name'], name='unique_parent_name', nulls_distinct=False)
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto generate slug from name (if name is changed, slug will be updated)
        base_slug = slugify(self.name)
        if (self.parent_id): 
            self.slug = f"{self.parent_id.slug}/{base_slug}"
        else:
            self.slug = base_slug
        super().save(*args, **kwargs)