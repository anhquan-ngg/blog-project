from .models import Post

class PostBuilder: 
    def __init__(self):
        self._author = None
        self._category = None 
        self._tags = []
        self._title = None 
        self._content = None
    
    def set_author(self, user):
        self._author = user
        return self
    
    def set_category(self, category):
        self._category = category
        return self
    
    def set_tags(self, tags):
        self._tags = tags or []
        return self
    
    def set_title(self, title):
        self._title = title
        return self
    
    def set_content(self, content):
        self._content = content
        return self
    
    def build(self):
        if not all([self._author, self._category, self._title, self._content is not None]):
            raise ValueError("[PostBuilder]: Author, category, title, and content are required")
            
        post = Post(
            author=self._author,
            category=self._category,
            title=self._title,
            content=self._content,
        )

        post.save()
        post.tags.set(self._tags)

        return post