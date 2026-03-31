# UC22 — Create Category

**Endpoint:** `POST /api/categories/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Tạo category

### Request (application/json)

```
POST /api/categories/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "name": "DevOps"
}
```

### Parameters

- `name` (string, required) - Tên category, tối đa 100 ký tự, phải unique

### Response 201 (application/json)

```json
{
  "id": 3,
  "name": "DevOps",
  "posts_count": 0,
  "created_at": "2024-01-16T00:00:00Z"
}
```

### Response 400 (application/json)

```json
{
  "name": ["category with this name already exists."]
}
```

### Response 403 (application/json)

```json
{
  "detail": "You do not have permission to perform this action."
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC23 — Update Category](uc23-update-category.md)
- [UC24 — Delete Category](uc24-delete-category.md)
