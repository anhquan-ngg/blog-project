from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Value, TextField
from .models import Post
from django.contrib.postgres.search import SearchVector

def extract_text_from_blocks(blocks: list) -> str:
    if not isinstance(blocks, list):
        return ""
    res = []
    for b in blocks:
        if isinstance(b, dict):
            # Lấy text tĩnh từ Editor.js block data
            data = b.get('data', {})
            if isinstance(data, dict):
                if 'text' in data:
                    res.append(str(data['text']))
                elif 'caption' in data:
                    res.append(str(data['caption']))
    return " ".join(res)

@receiver(post_save, sender=Post)
def update_search_vector(sender, instance, **kwargs):
    content_text = extract_text_from_blocks(instance.content)
    Post.objects.filter(pk=instance.pk).update(
        search_vector=(
            SearchVector(Value(instance.title, output_field=TextField()), weight="A", config="vietnamese")
            +
            SearchVector(Value(content_text, output_field=TextField()), weight="B", config="vietnamese")
        )
    )