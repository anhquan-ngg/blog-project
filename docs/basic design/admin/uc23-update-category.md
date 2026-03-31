# UC23 — Update Category

**Endpoint:** `PUT /api/categories/{slug}/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Cập nhật category

### Parameters

- `slug` (string, required) - Category slug hoặc ID

### Request (application/json)

```
PUT /api/categories/backend-development/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "name": "Backend Development"
}
```

### Response 200 (application/json)

```json
{
  "id": 1,
  "name": "Backend & API Development",
  "posts_count": 28,
  "created_at": "2024-01-01T00:00:00Z"
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
- [UC24 — Delete Category](uc24-delete-category.md)
