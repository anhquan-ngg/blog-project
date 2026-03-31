# UC4 — View Related Posts

**Endpoint:** `GET /api/posts/{id}/related/`

**Role:** Guest (no authentication required)

---

## Lấy bài viết liên quan theo category

Không cần xác thực. Trả về tối đa 4 bài cùng category, trừ bài hiện tại, sắp xếp theo `likes_count` giảm dần.

### Parameters

- `id` (integer, required) - Post ID
- `limit` (integer, optional) - Số bài trả về. Default: `4`

### Request

```
GET /api/posts/1/related/?limit=4 HTTP/1.1
```

### Response 200 (application/json)

```json
[
  {
    "id": 1,
    "title": "Getting Started with Django REST Framework",
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
    "created_at": "2024-01-14T10:00:00Z"
  }
]
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
- [UC3 — View Post Detail](uc03-view-post-detail.md)
