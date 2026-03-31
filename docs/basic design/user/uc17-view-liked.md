# UC17 — View Liked Posts

**Endpoint:** `GET /api/me/liked/`

**Role:** User (authentication required)

---

## Xem danh sách bài đã like

Trả về các post đã like của `request.user`,
sắp xếp theo thời gian like mới nhất (`-likes__created_at`).

### Parameters

- `limit` (integer, optional) - Default: `10`
- `offset` (integer, optional) - Default: `0`

### Request

```
GET /api/me/liked/?limit=10&offset=0 HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Response 200 (application/json)

```json
{
  "count": 12,
  "next": null,
  "previous": null,
  "results": [
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
      "likes_count": 1,
      "bookmarks_count": 0,
      "is_liked": true,
      "is_bookmarked": false
    }
  ]
}
```

### Response 401 (application/json)

```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC15/16 — Like/Unlike Post](uc15-16-like-unlike.md)
- [UC20 — View Bookmarks](uc20-view-bookmarks.md)
