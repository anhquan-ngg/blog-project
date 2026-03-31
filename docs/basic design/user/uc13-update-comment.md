# UC13 — Update Comment

**Endpoint:** `PATCH /api/comments/{id}/`

**Role:** User (owner only)

---

## Cập nhật bình luận

Chỉ chủ bình luận mới được sửa. Chỉ cho phép cập nhật `content`.

### Parameters

- `id` (integer, required) - Comment ID

### Request (application/json)

```
PATCH /api/comments/42/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "content": "Updated comment content."
}
```

### Response 200 (application/json)

```json
{
  "id": 42,
  "content": "Updated comment content!",
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
  "content": ["This field may not be blank."]
}
```

### Response 401 (application/json)

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### Response 403 (application/json)

```json
{
  "detail": "You do not have permission to perform this action."
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
- [UC12 — Create Comment](uc12-create-comment.md)
- [UC14 — Delete Comment](uc14-delete-comment.md)
