import os
import sys
import django

# Setup Django Environment
# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "blog_project.settings")
django.setup()

from django.db.models import Value, TextField
from django.contrib.postgres.search import SearchVector
from apps.posts.models import Post

def extract_text_from_blocks(blocks):
    """
    Copy of the text extraction logic used in signals.py
    """
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

def backfill():
    # Find posts without a search vector
    posts_to_update = Post.objects.filter(search_vector__isnull=True)
    count = posts_to_update.count()
    
    if count == 0:
        print("No posts found with empty search_vector.")
        return

    print(f"Found {count} post(s) to update.")
    
    updated_count = 0
    for post in posts_to_update:
        try:
            content_text = extract_text_from_blocks(post.content)
            
            # Perform update
            Post.objects.filter(pk=post.pk).update(
                search_vector=(
                    SearchVector(Value(post.title, output_field=TextField()), weight="A", config="vietnamese")
                    +
                    SearchVector(Value(content_text, output_field=TextField()), weight="B", config="vietnamese")
                )
            )
            updated_count += 1
            if updated_count % 10 == 0:
                print(f"Updated {updated_count}/{count} posts...")
                
        except Exception as e:
            print(f"Error updating post {post.id}: {str(e)}")

    print(f"Successfully backfilled {updated_count} post(s).")

if __name__ == "__main__":
    backfill()
