# UC9 — Create Post

**Endpoint:** `POST /api/posts/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Tạo bài viết mới.  
`author` tự động gán từ `request.user` — không nhận từ client.  
`likes_count` và `bookmarks_count` khởi tạo = `0`.  
Trả về `201 Created` kèm thông tin đầy đủ của bài vừa tạo.

---

## 2. Business Rules

| #   | Rule                                                                             |
| --- | -------------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới tạo được bài                          |
| BR2 | `author` gán tự động từ `request.user`, không nhận từ request body              |
| BR3 | `title` bắt buộc, tối đa 200 ký tự                                              |
| BR4 | `content` bắt buộc, lưu dạng **Mảng JSON** (chứa các block đại diện cho nội dung)     |
| BR5 | `category` bắt buộc và phải tồn tại trong DB; không tồn tại → `400`             |
| BR6 | `tags` là danh sách tag ID, tùy chọn; tag không tồn tại → `400`                 |
| BR7 | `is_deleted` mặc định `False`, `likes_count` và `bookmarks_count` mặc định `0`  |
| BR8 | Phải trích xuất các block `type="image"` trong `content` để đồng bộ (lưu) xuống bảng mirror `post_images`. |

---

## 3. Request

### Headers

| Header          | Value                              | Required   |
| --------------- | ---------------------------------- | ---------- |
| `Authorization` | `Token <token>`                    | Bắt buộc   |
| `Content-Type`  | `application/json`                 | Bắt buộc   |

### Request mẫu

```
POST /api/posts/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "title": "Getting Started with Django REST Framework",
  "content": [
    {
      "type": "paragraph",
      "data": { "text": "Django is a Python web framework..." }
    }
  ],
  "category": 2,
  "tags": [1, 3]
}
```

### Body Parameters

| Field      | Type          | Required | Mô tả                            |
| ---------- | ------------- | -------- | -------------------------------- |
| `title`    | string        | **Yes**  | Tiêu đề, tối đa 200 ký tự        |
| `content`  | array[object] | **Yes**  | Mảng JSON mô tả bài viết (heading, paragraph, image...) |
| `category` | integer       | **Yes**  | ID của category tồn tại          |
| `tags`     | array[integer]| No       | Danh sách tag ID                 |

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu không có token.
2. **Validate Input** — Kiểm tra `title`, `content`, `category`, `tags`; kiểm tra `category` tồn tại; kiểm tra tag tồn tại nếu có → `400` nếu lỗi.
3. **Create Post** — `Post.objects.create(author=request.user, ...)`, set `tags` (M2M).
4. **Sync Post Images** — Quét `content` lấy tất cả block `type="image"` và insert vào `post_images`.
5. **Serialize & Return** — Serialize bài vừa tạo → `201 Created`.

---

## 5. Database Operations

### Tables Affected

| Table       | Operation | Note                                         |
| ----------- | --------- | -------------------------------------------- |
| `categories`| SELECT    | Kiểm tra category tồn tại                    |
| `tags`      | SELECT    | Kiểm tra tag tồn tại                         |
| `posts`     | INSERT    | Tạo bài viết mới                             |
| `post_images`| INSERT    | Lưu danh sách ảnh được dùng trong bài        |
| `post_tags` | INSERT    | Gắn tags vào bài (M2M through table)         |

### Query (Django ORM)

```python
# Tạo post
post = Post.objects.create(
    author      = request.user,
    title       = validated_data["title"],
    content     = validated_data["content"],
    category_id = validated_data["category"],
    is_deleted  = False,
    likes_count     = 0,
    bookmarks_count = 0,
)

# Gắn tags
if tags:
    post.tags.set(tags)

# Sync ảnh từ content vào post_images
sync_post_images(post)
```

---

## 6. Response

### 201 Created

```json
{
  "id": 101,
  "title": "Getting Started with Django REST Framework",
  "content": [
    {
      "type": "paragraph",
      "data": { "text": "Django is a Python web framework..." }
    }
  ],
  "category": {
    "id": 2,
    "name": "Backend Development"
  },
  "author": {
    "id": 1,
    "username": "johndoe"
  },
  "tags": [
    { "id": 1, "name": "Django", "slug": "django" },
    { "id": 3, "name": "REST API", "slug": "rest-api" }
  ],
  "likes_count": 0,
  "bookmarks_count": 0,
  "created_at": "2024-01-14T10:00:00Z",
  "updated_at": "2024-01-14T10:00:00Z"
}
```

### 400 Bad Request — Validation lỗi

```json
{
  "title": ["This field is required."],
  "category": ["Invalid pk \"999\" - object does not exist."]
}
```

### 401 Unauthorized

```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                          | Cách fix                                   |
| ----- | ------------------------------------ | ------------------------------------------ |
| `400` | Thiếu `title`, `content`, `category` | Bổ sung các field bắt buộc                 |
| `400` | `category` không tồn tại             | Dùng `category_id` hợp lệ                 |
| `400` | Tag ID không tồn tại                 | Dùng tag ID hợp lệ                         |
| `401` | Thiếu token xác thực                 | Thêm header `Authorization: Token <token>` |
| `500` | Lỗi database                         | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                          | Mô tả                              |
| --------------------------------------------- | ---------------------------------- |
| [UC10 — Update Post](uc10-update-post.md)     | Cập nhật bài viết                  |
| [UC11 — Delete Post](uc11-delete-post.md)     | Xóa bài viết                       |
| [UC21 — Upload Image](uc21-upload-image.md)   | Upload ảnh đính kèm bài            |
| [UC1 — View Categories](../guest/uc01-view-categories.md) | Lấy category ID     |
| [README](../README.md)                        | API Documentation Index            |
