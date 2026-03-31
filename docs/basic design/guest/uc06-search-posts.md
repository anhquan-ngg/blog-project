# UC6 — Search Posts

**Endpoint:** `GET /api/posts/search/`

**Role:** Guest (no authentication required)

---

## Tìm kiếm bài viết

Không cần xác thực. Tìm kiếm trong `title` và `content` (`icontains`).

### Parameters

- `q` (string, required) - Từ khóa tìm kiếm, tối thiểu 2 ký tự
- `limit` (integer, optional) - Default: `10`
- `offset` (integer, optional) - Default: `0`
- `category` (integer, optional) - Giới hạn tìm trong category

### Request

```
GET /api/posts/search/?q=django&limit=10&offset=0 HTTP/1.1
```

### Response 200 (application/json)

```json
{
  "count": 8,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Getting Started with Django REST Framework",
      "author": {
        "id": 1,
        "username": "johndoe"
      },
      "category": {
        "id": 2,
        "name": "Backend"
      }
    }
  ]
}
```

### Response 400 (application/json)

```json
{
  "q": ["This field is required."]
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC2 — View Posts](uc02-view-posts.md)
