# UC10 — Update Post

**Endpoint:** `PUT /api/posts/{id}/` or `PATCH /api/posts/{id}/`

**Role:** User (owner only)

---

## Cập nhật toàn bộ bài viết [PUT]

Chỉ chủ bài viết mới được sửa. Tất cả field bắt buộc phải gửi.

### Request (multipart/form-data)

```
PUT /api/posts/1/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4

{
  "title": "Getting Started with Django REST Framework",
  "content": [...],
  "thumbnail": <file>,
  "category": 2
}
```

### Response 200 (application/json)

```json
{
  "id": 1,
  "title": "Getting Started with Django REST Framework",
  "content": [...],
  "thumbnail": "https://s3.amazonaws.com/bucket/media/posts/thumb.jpg",
  "category": {
    "id": 2,
    "name": "Backend"
  },
  "author": {
    "id": 1,
    "username": "johndoe"
  },
  "likes_count": 0,
  "bookmarks_count": 0,
  "created_at": "2024-01-14T10:00:00Z",
  "updated_at": "2024-01-14T10:00:00Z"
}
```

### Response 400, 401, 403, 404

See error responses below.

---

## Cập nhật một phần bài viết [PATCH]

Chỉ chủ bài viết mới được sửa. Chỉ truyền field cần thay đổi.

### Request (application/json)

```
PATCH /api/posts/1/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "category": 3
}
```

### Response 200 (application/json)

```json
{
  "id": 1,
  "title": "Getting Started with Django REST Framework",
  "category": 3,
  "updated_at": "2024-01-16T10:00:00Z"
}
```

---

## Error Responses

### Response 400 (application/json)

```json
{
  "title": ["This field may not be blank."]
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
- [UC9 — Create Post](uc09-create-post.md)
- [UC11 — Delete Post](uc11-delete-post.md)
