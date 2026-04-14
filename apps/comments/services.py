from .models import Comment
from apps.files.models import File, FileStatus

def attach_file_to_comment(file_id: int, comment: Comment) -> None:
    File.objects.filter(pk=file_id).update(
        entity_type='comment',
        entity_id=comment.id,
        status=FileStatus.ACTIVE
    )

def detach_file_from_comment(comment: Comment) -> None:
    File.objects.filter(entity_type='comment', entity_id=comment.id).update(
        entity_type=None,
        entity_id=None
    )