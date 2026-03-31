# UC21 — Upload Image

**Endpoint:** `POST /api/upload/image/`

**Role:** User (authentication required)

---

## Upload ảnh

Trả về URL của ảnh trên S3.
Dùng URL này để gán vào field `thumbnail` khi tạo / sửa bài viết (UC9, UC10).

### Request (multipart/form-data)

```
POST /api/upload/image/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: multipart/form-data

{
  "image": <file>
}
```

### Parameters

- `image` (file, required) - Chỉ JPEG / PNG; tối đa 5MB

### Response 201 (application/json)

```json
{
  "image_url": "https://s3.amazonaws.com/bucket/media/uploads/1/abc123.jpg",
  "uploaded_at": "2024-01-16T08:30:00Z"
}
```

### Response 400 (application/json)

```json
{
  "image": ["Only JPEG, PNG are accepted.", "Image must not exceed 5MB."]
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
- [UC9 — Create Post](uc09-create-post.md)
- [UC10 — Update Post](uc10-update-post.md)
