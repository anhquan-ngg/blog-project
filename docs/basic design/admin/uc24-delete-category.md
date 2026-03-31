# UC24 — Delete Category

**Endpoint:** `DELETE /api/categories/{category_id}/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Xóa category

Chỉ cho phép xóa category **chưa có bài viết nào**.
Nếu category đang có bài viết, trả về 400 kèm số lượng bài hiện có.

### Parameters

- `category_id` (integer, required) - Category ID

### Request

```
DELETE /api/categories/3/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Response 204

No content (success).

### Response 400 (application/json)

Category đang có bài viết — không được phép xóa.

```json
{
  "non_field_errors": [
    "Cannot delete category 'Backend Development' because it has 28 post(s)."
  ]
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
- [UC22 — Create Category](uc22-create-category.md)
- [UC23 — Update Category](uc23-update-category.md)
