# UC12 — Create Comment

**Endpoint:** `POST /api/posts/{post_id}/comments/`

**Role:** User (authentication required)

---

## Đăng bình luận

### Parameters

- `post_id` (integer, required) - ID của bài viết

### Request (application/json)

```
POST /api/posts/1/comments/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "content": "This is a great explanation!"
}
```

### Response 201 (application/json)

```json
{
  "id": 42,
  "content": "This is a great explanation!",
  "author": {
    "id": 5,
    "username": "bob"
  },
  "created_at": "2024-01-16T09:00:00Z",
  "updated_at": "2024-01-16T09:00:00Z"
}
```

### Response 400 (application/json)

```json
{
  "content": ["This field is required."]
}
```

### Response 401 (application/json)

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### Response 404 (application/json)

Post không tồn tại.

```json
{
  "detail": "Not found."
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC5 — View Comments](../guest/uc05-view-comments.md)
- [UC13 — Update Comment](uc13-update-comment.md)
