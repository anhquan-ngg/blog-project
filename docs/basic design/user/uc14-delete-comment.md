# UC14 — Delete Comment

**Endpoint:** `DELETE /api/comments/{id}/`

**Role:** User (owner only) / Admin (any comment)

---

## Xóa bình luận

Chỉ chủ bình luận hoặc Admin mới được xóa.

### Parameters

- `id` (integer, required) - Comment ID

### Request

```
DELETE /api/comments/42/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Response 204

No content (success).

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
- [UC13 — Update Comment](uc13-update-comment.md)
