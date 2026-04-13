from django.db import models
from django.conf import settings
from django.db.models import Index
from .services import delete_image_from_s3
import logging

logger = logging.getLogger(__name__)

class FileStatus(models.TextChoices):
    ACTIVE = 'active'
    INACTIVE = 'inactive'

class File(models.Model):
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files',db_column='uploaded_by')
    url = models.URLField(max_length=200, null=False, blank=False)
    s3_key = models.CharField(max_length=200, null=False, blank=False)
    status = models.CharField(max_length=20, choices=FileStatus.choices, default=FileStatus.ACTIVE)
    entity_id = models.IntegerField(null=True, blank=True)
    entity_type = models.CharField(max_length=50, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'files'
        indexes = [
            Index(fields=['entity_id', 'entity_type'], name='idx_files_entity_id_type'),
        ]

    def __str__(self):
        return f'{self.uploaded_by} uploaded {self.url}'
    
    def delete(self, *args, **kwargs):
        # Delete image from S3 then soft delete
        try:
            delete_image_from_s3(self.s3_key)
        except Exception as e:
            logger.error(f"Failed to delete image from S3 (Key: {self.s3_key}): {e}", exc_info=True)
            
        self.status = FileStatus.INACTIVE
        self.save(update_fields=['status'])
