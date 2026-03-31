# UC25 — Delete Post (Admin)

**Endpoint:** `DELETE /api/posts/{id}/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Xóa bài viết của bất kỳ user nào

Admin có thể xóa bài viết của bất kỳ ai, không bị giới hạn bởi ownership.
Dùng chung endpoint với UC11 — phân biệt quyền theo `is_staff`.

### Parameters

- `id` (integer, required) - Post ID

### Request

```
DELETE /api/posts/1/ HTTP/1.1
Authorization: Token <admin_token>
```

### Response 204

No content (success).

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
- [UC11 — Delete Post (User)](../user/uc11-delete-post.md)
