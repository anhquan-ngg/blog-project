# UC11 — Delete Post

**Endpoint:** `DELETE /api/posts/{id}/`

**Role:** User (owner only) / Admin (any post)

---

## Xóa bài viết

User chỉ xóa được bài của chính mình.
Admin xóa được bài của bất kỳ ai (xem UC25).

### Parameters

- `id` (integer, required) - Post ID

### Request

```
DELETE /api/posts/1/ HTTP/1.1
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
- [UC9 — Create Post](uc09-create-post.md)
- [UC25 — Delete Post (Admin)](../admin/uc25-delete-post-admin.md)
