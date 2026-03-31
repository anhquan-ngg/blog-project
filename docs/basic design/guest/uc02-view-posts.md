# UC2 — View Posts

**Endpoint:** `GET /api/posts/`

**Role:** Guest (authentication optional)

---

## Lấy danh sách bài viết

Không cần xác thực. Nếu đã đăng nhập, response thêm `is_liked` và `is_bookmarked`.

### Parameters

- `limit` (integer, optional) - Số item mỗi trang. Default: `10`, Max: `100`
- `offset` (integer, optional) - Số item bỏ qua. Default: `0`
- `category` (integer, optional) - Lọc theo category ID
- `author` (integer, optional) - Lọc theo author user ID
- `ordering` (string, optional) - `created_at` (default), `likes_count`, ...

### Request

```
GET /api/posts/?limit=10&offset=0 HTTP/1.1
Authorization: Token <token> (optional)
```

### Response 200 (application/json)

```json
{
  "count": 45,
  "next": "https://api.blogproject.com/api/v1/posts/?limit=10&offset=10",
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
      "likes_count": 47,
      "bookmarks_count": 12,
      "is_liked": true,
      "is_bookmarked": false,
      "created_at": "2024-01-14T10:00:00Z"
    }
  ]
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC3 — View Post Detail](uc03-view-post-detail.md)
