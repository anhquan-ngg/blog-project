# UC3 — View Post Detail

**Endpoint:** `GET /api/posts/{id}/`

**Role:** Guest (authentication optional)

---

## Lấy chi tiết bài viết

Không cần xác thực. Xem chi tiết bài viết của tất cả mọi người.

### Parameters

- `id` (integer, required) - Post ID

### Request

```
GET /api/posts/1/ HTTP/1.1
Authorization: Token <token> (optional)
```

### Response 200 (application/json)

```json
{
  "id": 1,
  "title": "Getting Started with Django REST Framework",
  "content": [
    {
      "type": "text",
      "value": "Django is a Python Framework."
    },
    {
      "type": "image",
      "url": "https://s3.amazonaws.com/...",
      "caption": "Django Logo"
    }
  ],
  "thumbnail": "https://s3.amazonaws.com/bucket/media/posts/thumb.jpg",
  "category": {
    "id": 2,
    "name": "Backend"
  },
  "author": {
    "id": 1,
    "username": "johndoe"
  },
  "likes_count": 47,
  "bookmarks_count": 12,
  "is_liked": true,
  "is_bookmarked": false,
  "created_at": "2024-01-14T10:00:00Z",
  "updated_at": "2024-01-15T08:00:00Z"
}
```

### Response 404 (application/json)

```json
{
  "detail": "Not found."
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC2 — View Posts](uc02-view-posts.md)
- [UC4 — View Related Posts](uc04-view-related-posts.md)
