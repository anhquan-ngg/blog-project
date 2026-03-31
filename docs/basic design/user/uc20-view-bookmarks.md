# UC20 — View Bookmarks

**Endpoint:** `GET /api/me/bookmarks/`

**Role:** User (authentication required)

---

## Xem danh sách bài đã bookmark

Sắp xếp theo thời gian bookmark mới nhất (`-bookmarks__created_at`).

### Parameters

- `limit` (integer, optional) - Default: `10`
- `offset` (integer, optional) - Default: `0`

### Request

```
GET /api/me/bookmarks/?limit=10&offset=0 HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Response 200 (application/json)

```json
{
  "count": 7,
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
      "likes_count": 0,
      "bookmarks_count": 1,
      "is_liked": true,
      "is_bookmarked": true
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
- [UC18/19 — Bookmark/Unbookmark](uc18-19-bookmark.md)
- [UC17 — View Liked Posts](uc17-view-liked.md)
