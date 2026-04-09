from .models import PostImages
from apps.files.models import File 

def sync_post_images(post) -> None: 
    """
    Sync post images from post.content to post_images table
    - Delete images that are not in the content
    - Upsert images that are in the content
    """
    blocks = post.content or []
    image_blocks = [block for block in blocks if block.get("type") == "image"]
    image_file_ids = [block.get("data", {}).get("file_id") for block in image_blocks]
    
    # Delete images that are not in the content
    PostImages.objects.filter(post=post).exclude(file_id__in=image_file_ids).delete()

    # Upsert images that are in the content
    for index, block in enumerate(image_blocks):
        file_id = block.get("data", {}).get("file_id")
        caption = block.get("data", {}).get("caption")
        PostImages.objects.update_or_create(
            post=post,
            file_id=file_id,
            defaults={
                "caption": caption,
                "order": index,
            }
        )
        File.objects.filter(id=file_id).update(entity_type='post', entity_id=post.id)
    


    
