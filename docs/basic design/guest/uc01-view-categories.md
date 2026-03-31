# UC1 — View Categories

**Endpoint:** `GET /api/categories/`

**Role:** Guest (no authentication required)

---

## Lấy danh sách categories

Không cần xác thực. Trả về toàn bộ danh mục kèm số bài viết đã published.

### Request

```
GET /api/categories/ HTTP/1.1
```

No authentication required (optional).

### Response 200 (application/json)

```json
[
  {
    "id": 1,
    "name": "Backend Development",
    "posts_count": 28,
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "Frontend Development",
    "posts_count": 15,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

## Related Files

- [README](../README.md) - API Documentation Index
