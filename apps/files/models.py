from django.db import models
from django.conf import settings
from django.db.models import Index

class FileStatus(models.TextChoices):
    ACTIVE = 'active'
    INACTIVE = 'inactive'

class File(models.Model):
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files',db_column='uploaded_by')
    url = models.URLField(max_length=200, null=False, blank=False)
    s3_key = models.CharField(max_length=200, null=False, blank=False)
    status = models.CharField(max_length=20, choices=FileStatus.choices, default=FileStatus.ACTIVE)
    entity_id = models.IntegerField(null=False, blank=False)
    entity_type = models.CharField(max_length=50, null=False, blank=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'files'
        indexes = [
            Index(fields=['entity_id', 'entity_type'], name='idx_files_entity_id_type'),
        ]

    def __str__(self):
        return f'{self.uploaded_by} uploaded {self.file}'
