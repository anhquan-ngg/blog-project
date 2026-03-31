# UC37 — Update Post Tags

**Endpoint:** `PUT /api/posts/{id}/tags/`  
**Role:** User (owner only)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Thay thế toàn bộ danh sách tag của bài viết bằng danh sách mới.  
Chỉ chủ bài viết mới được thao tác.  
Khác với UC36 (chỉ append) — UC37 dùng `SET` để replace hoàn toàn.  
Truyền `tag_ids: []` để xóa toàn bộ tag khỏi bài.

---

## 2. Business Rules

| #   | Rule                                                                         |
| --- | ---------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                           |
| BR2 | Chỉ `author` của bài mới được cập nhật tag → `403` nếu không                |
| BR3 | Bài viết phải tồn tại và `is_deleted=False` → `404` nếu không               |
| BR4 | `tag_ids` là danh sách ID các tag đã tồn tại — tag không tồn tại → `400`     |
| BR5 | Replace toàn bộ: xóa tất cả `post_tags` cũ, thêm mới theo `tag_ids`         |
| BR6 | `tag_ids: []` hợp lệ — xóa toàn bộ tag khỏi bài                             |
| BR7 | Trả về `200 OK` kèm danh sách tag mới của bài                                |

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

### Request mẫu — Replace với danh sách tag mới

```
PUT /api/posts/1/tags/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "tag_ids": [2, 4]
}
```

### Request mẫu — Xóa toàn bộ tag

```
PUT /api/posts/1/tags/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "tag_ids": []
}
```

### Body Parameters

| Field     | Type          | Required | Mô tả                                        |
| --------- | ------------- | -------- | -------------------------------------------- |
| `tag_ids` | array[integer]| **Yes**  | Danh sách ID tag mới. `[]` để xóa toàn bộ tag |

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table       | Operation     | Note                                             |
| ----------- | ------------- | ------------------------------------------------ |
| `posts`     | SELECT        | Xác nhận bài tồn tại, `is_deleted=False`         |
| `tags`      | SELECT        | Kiểm tra các `tag_id` tồn tại                    |
| `post_tags` | DELETE        | Xóa toàn bộ tag cũ của bài                       |
| `post_tags` | INSERT        | Thêm mới theo danh sách `tag_ids`                |

### Query (Django ORM)

```python
post = get_object_or_404(Post, pk=pk, is_deleted=False)

# Validate tags
tags = Tag.objects.filter(pk__in=tag_ids) if tag_ids else Tag.objects.none()
if tag_ids and tags.count() != len(set(tag_ids)):
    raise ValidationError({"tag_ids": "One or more tag IDs do not exist."})

# Django M2M set() tự xử lý DELETE cũ + INSERT mới trong 1 transaction
post.tags.set(tags)

return post.tags.all().order_by("name")
```

---

## 6. Response

### 200 OK — Sau khi thay thế tag

```json
{
  "post_id": 1,
  "tags": [
    { "id": 2, "name": "FastAPI", "slug": "fastapi" },
    { "id": 4, "name": "Python", "slug": "python" }
  ]
}
```

### 200 OK — Sau khi xóa toàn bộ tag (`tag_ids: []`)

```json
{
  "post_id": 1,
  "tags": []
}
```

### 400 Bad Request — Tag ID không tồn tại

```json
{
  "tag_ids": ["One or more tag IDs do not exist."]
}
```

### 400 Bad Request — Thiếu field `tag_ids`

```json
{
  "tag_ids": ["This field is required."]
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

| HTTP  | Nguyên nhân                          | Cách fix                                   |
| ----- | ------------------------------------ | ------------------------------------------ |
| `400` | Field `tag_ids` bị thiếu             | Truyền `tag_ids` (có thể là `[]`)           |
| `400` | Có tag ID không tồn tại              | Kiểm tra tag ID qua UC35                   |
| `401` | Thiếu token                          | Thêm header `Authorization: Token <token>` |
| `403` | Không phải chủ bài                   | Chỉ `author` của bài mới được sửa tag      |
| `404` | Bài không tồn tại hoặc đã bị xóa     | Kiểm tra `id` bài viết                     |
| `500` | Lỗi database                         | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                                  | Mô tả                              |
| ----------------------------------------------------- | ---------------------------------- |
| [UC36 — Add Tag to Post](uc36-add-tag-to-post.md)     | Chỉ append tag, không replace      |
| [UC35 — View Tag List](uc35-view-tags.md)             | Lấy danh sách tag ID               |
| [UC10 — Update Post](uc10-update-post.md)             | Cập nhật bài (bao gồm tags)        |
| [README](../README.md)                                | API Documentation Index            |
