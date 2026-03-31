# UC10 — Update Post

**Endpoint:** `PUT /api/posts/{id}/` hoặc `PATCH /api/posts/{id}/`  
**Role:** User (owner only)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Cập nhật bài viết hiện có.  
`PUT` yêu cầu truyền đủ tất cả field bắt buộc (full update).  
`PATCH` chỉ truyền field cần thay đổi (partial update).  
Chỉ chủ bài viết (`author`) mới được cập nhật — không phải admin.

---

## 2. Business Rules

| #   | Rule                                                                 |
| --- | -------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                   |
| BR2 | Chỉ `author` của bài mới được sửa → `403` nếu không phải chủ sở hữu  |
| BR3 | Bài không tồn tại hoặc `is_deleted=True` → `404`                     |
| BR4 | `PUT`: `title`, `content` (dạng **Mảng JSON block**), `category` đều bắt buộc       |
| BR5 | `PATCH`: chỉ truyền field cần thay đổi; các field còn lại giữ nguyên |
| BR6 | `category` mới phải tồn tại trong DB → `400` nếu không hợp lệ        |
| BR7 | `tags` mới phải tồn tại trong DB → `400` nếu không hợp lệ            |
| BR8 | `author`, `likes_count`, `bookmarks_count` không thể sửa qua API này |
| BR9 | `updated_at` tự động cập nhật khi lưu                                |
| BR10 | Nếu `content` có sự thay đổi, server phải tự động quét block `type="image"` để đồng bộ bảng `post_images` (xóa mapping dư thừa và thêm mới). |

---

## 3. Request

### Headers

| Header          | Value              | Required |
| --------------- | ------------------ | -------- |
| `Authorization` | `Token <token>`    | Bắt buộc |
| `Content-Type`  | `application/json` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả   |
| ----- | ------- | -------- | ------- |
| `id`  | integer | Yes      | Post ID |

### Request mẫu — PUT (full update)

```
PUT /api/posts/1/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "title": "Updated Title",
  "content": [
    {
      "type": "paragraph",
      "data": { "text": "Updated content..." }
    }
  ],
  "category": 3,
  "tags": [1, 2]
}
```

### Request mẫu — PATCH (partial update)

```
PATCH /api/posts/1/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "category": 3
}
```

### Body Parameters

| Field      | Type           | Required (PUT) | Required (PATCH) | Mô tả                     |
| ---------- | -------------- | -------------- | ---------------- | ------------------------- |
| `title`    | string         | **Yes**        | No               | Tiêu đề, tối đa 200 ký tự |
| `content`  | array[object]  | **Yes**        | No               | Mảng JSON chứa các block bài viết |
| `category` | integer        | **Yes**        | No               | ID category tồn tại       |
| `tags`     | array[integer] | No             | No               | Danh sách tag ID          |

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu.
2. **Fetch Post** — `get_object_or_404(Post, pk=id, is_deleted=False)` → `404` nếu không tìm thấy.
3. **Permission Check** — `request.user == post.author` → `403` nếu không phải chủ sở hữu.
4. **Validate Input** — Kiểm tra field (PUT: all required; PATCH: partial); kiểm tra `category`, `tags` tồn tại → `400` nếu lỗi.
5. **Update Post** — `post.save()`, `post.tags.set(tags)`.
6. **Sync Post Images** — Nếu trường `content` được update, gọi hàm sync lại thư viện ảnh của bài xuống bảng `post_images`.
7. **Serialize & Return** — Serialize bài sau khi update → `200 OK`.

---

## 5. Database Operations

### Tables Affected

| Table        | Operation       | Note                                     |
| ------------ | --------------- | ---------------------------------------- |
| `posts`      | SELECT          | Lấy bài theo `pk`, kiểm tra `is_deleted` |
| `categories` | SELECT          | Kiểm tra category mới tồn tại            |
| `tags`       | SELECT          | Kiểm tra tag mới tồn tại                 |
| `posts`      | UPDATE          | Cập nhật các field                       |
| `post_images`| DELETE + INSERT | Cập nhật đồng bộ list ảnh từ nội dung mới|
| `post_tags`  | DELETE + INSERT | Cập nhật tags (M2M)                      |

### Query (Django ORM)

```python
post = get_object_or_404(Post, pk=pk, is_deleted=False)

# Partial update (PATCH)
for field, value in validated_data.items():
    setattr(post, field, value)
post.save()

# Cập nhật tags
if "tags" in validated_data:
    post.tags.set(validated_data["tags"])

# Sync ảnh từ content vào post_images
if "content" in validated_data:
    sync_post_images(post)
```

---

## 6. Response

### 200 OK

```json
{
  "id": 1,
  "title": "Updated Title",
  "content": [
    {
      "type": "paragraph",
      "data": { "text": "Updated content..." }
    }
  ],
  "category": {
    "id": 3,
    "name": "Frontend Development"
  },
  "author": {
    "id": 1,
    "username": "johndoe"
  },
  "tags": [{ "id": 1, "name": "Django", "slug": "django" }],
  "likes_count": 47,
  "bookmarks_count": 12,
  "created_at": "2024-01-14T10:00:00Z",
  "updated_at": "2024-01-16T10:00:00Z"
}
```

### 400 Bad Request

```json
{
  "title": ["This field may not be blank."]
}
```

### 401 Unauthorized

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden

```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found

```json
{
  "detail": "Not found."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                         | Cách fix                                   |
| ----- | ----------------------------------- | ------------------------------------------ |
| `400` | Field bắt buộc bị thiếu/trống (PUT) | Truyền đủ `title`, `content`, `category`   |
| `400` | `category` không tồn tại            | Dùng `category_id` hợp lệ                  |
| `401` | Thiếu token                         | Thêm header `Authorization: Token <token>` |
| `403` | Không phải chủ bài                  | Chỉ `author` mới được sửa                  |
| `404` | Bài không tồn tại hoặc đã xóa       | Kiểm tra `id` và trạng thái bài            |
| `500` | Lỗi database                        | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                        | Mô tả                   |
| ------------------------------------------- | ----------------------- |
| [UC9 — Create Post](uc09-create-post.md)    | Tạo bài viết            |
| [UC11 — Delete Post](uc11-delete-post.md)   | Xóa bài viết            |
| [UC21 — Upload Image](uc21-upload-image.md) | Upload ảnh đính kèm     |
| [README](../README.md)                      | API Documentation Index |
