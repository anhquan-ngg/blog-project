# UC5 — View Comments

**Endpoint:** `GET /api/posts/{post_id}/comments/`

**Role:** Guest (no authentication required)

---

## Lấy danh sách bình luận

Không cần xác thực. Trả về danh sách bình luận của bài viết.

### Parameters

- `post_id` (integer, required) - ID của bài viết
- `limit` (integer, optional) - Default: `20`
- `offset` (integer, optional) - Default: `0`

### Request

```
GET /api/posts/1/comments/?limit=20&offset=0 HTTP/1.1
```

### Response 200 (application/json)

```json
{
  "count": 18,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "content": "Great article! Very helpful.",
      "author": {
        "id": 3,
        "username": "alice"
      },
      "created_at": "2024-01-15T09:30:00Z",
      "updated_at": "2024-01-15T09:30:00Z"
    }
  ]
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
- [UC3 — View Post Detail](uc03-view-post-detail.md)
- [UC12 — Create Comment](../user/uc12-create-comment.md)
