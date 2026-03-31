# UC9 — Create Post

**Endpoint:** `POST /api/posts/`

**Role:** User (authentication required)

---

## Tạo bài viết

`author` tự động gán từ `request.user`.

### Request (multipart/form-data)

```
POST /api/posts/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: multipart/form-data

{
  "title": "Getting Started with Django REST Framework",
  "content": [
    {
      "type": "text",
      "value": "Django is a Python Framework."
    },
    {
      "type": "image",
      "url": "https://s3.amazonaws.com/...",
      "caption": "Django Logo"
    }
  ],
  "thumbnail": <file>,
  "category": 2
}
```

### Parameters

- `title` (string, required) - Tiêu đề, tối đa 200 ký tự
- `content` (string, required) - Nội dung đầy đủ dạng JSON Block
- `category` (integer, required) - ID của category tồn tại
- `thumbnail` (file, optional) - URL ảnh được lưu trên S3

### Response 201 (application/json)

```json
{
  "id": 1,
  "title": "Getting Started with Django REST Framework",
  "content": [
    {
      "type": "text",
      "value": "Django is a Python Framework."
    },
    {
      "type": "image",
      "url": "https://s3.amazonaws.com/...",
      "caption": "Django Logo"
    }
  ],
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

### Response 400 (application/json)

```json
{
  "title": ["This field is required."],
  "category": ["Invalid pk \"999\" - object does not exist."]
}
```

### Response 401 (application/json)

```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC10 — Update Post](uc10-update-post.md)
- [UC21 — Upload Image](uc21-upload-image.md)
