# UC36 — Add Tag to Post

**Endpoint:** `POST /api/posts/{id}/tags/`  
**Role:** User (owner only)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Thêm một hoặc nhiều tag vào bài viết.  
Chỉ chủ bài viết mới được thêm tag.  
Không xóa các tag hiện có — chỉ append thêm. Dùng UC37 nếu muốn replace toàn bộ.

---

## 2. Business Rules

| #   | Rule                                                                         |
| --- | ---------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                           |
| BR2 | Chỉ `author` của bài mới được thêm tag → `403` nếu không phải chủ sở hữu    |
| BR3 | Bài viết phải tồn tại và `is_deleted=False` → `404` nếu không               |
| BR4 | `tag_ids` là danh sách ID các tag đã tồn tại — tag không tồn tại → `400`     |
| BR5 | Không xóa tag cũ — chỉ thêm tag mới (append). Dùng UC37 để replace          |
| BR6 | Tag đã được gắn vào bài thì bỏ qua (không báo lỗi), không tạo duplicate     |
| BR7 | Trả về `200 OK` kèm danh sách **toàn bộ** tag hiện tại của bài sau khi thêm |

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

### Request mẫu

```
POST /api/posts/1/tags/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "tag_ids": [1, 3, 5]
}
```

### Body Parameters

| Field     | Type          | Required | Mô tả                                  |
| --------- | ------------- | -------- | -------------------------------------- |
| `tag_ids` | array[integer]| **Yes**  | Danh sách ID tag cần thêm vào bài. Min 1 phần tử |

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table       | Operation | Note                                              |
| ----------- | --------- | ------------------------------------------------- |
| `posts`     | SELECT    | Xác nhận bài tồn tại, `is_deleted=False`          |
| `tags`      | SELECT    | Kiểm tra các `tag_id` tồn tại                     |
| `post_tags` | INSERT    | Thêm bản ghi mới (bỏ qua nếu đã tồn tại — unique constraint) |

### Query (Django ORM)

```python
post = get_object_or_404(Post, pk=pk, is_deleted=False)

# Validate tags exist
tags = Tag.objects.filter(pk__in=tag_ids)
if tags.count() != len(set(tag_ids)):
    raise ValidationError({"tag_ids": "One or more tag IDs do not exist."})

# Append (không xóa tag cũ)
post.tags.add(*tags)

# Trả về toàn bộ tag hiện tại
return post.tags.all().order_by("name")
```

---

## 6. Response

### 200 OK

```json
{
  "post_id": 1,
  "tags": [
    { "id": 1, "name": "Django", "slug": "django" },
    { "id": 3, "name": "Python", "slug": "python" },
    { "id": 5, "name": "Tutorial", "slug": "tutorial" }
  ]
}
```

### 400 Bad Request — `tag_ids` rỗng

```json
{
  "tag_ids": ["This field is required."]
}
```

### 400 Bad Request — Tag ID không tồn tại

```json
{
  "tag_ids": ["One or more tag IDs do not exist."]
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

| HTTP  | Nguyên nhân                         | Cách fix                                     |
| ----- | ----------------------------------- | -------------------------------------------- |
| `400` | `tag_ids` thiếu hoặc rỗng           | Truyền ít nhất 1 tag ID hợp lệ              |
| `400` | Có tag ID không tồn tại             | Kiểm tra tag ID qua UC35 trước khi gửi       |
| `401` | Thiếu token                         | Thêm header `Authorization: Token <token>`   |
| `403` | Không phải chủ bài                  | Chỉ `author` của bài mới được thêm tag       |
| `404` | Bài không tồn tại hoặc đã bị xóa    | Kiểm tra `id` bài viết                       |
| `500` | Lỗi database                        | Kiểm tra kết nối DB, xem server log          |

---

## 8. Related Files

| File                                                  | Mô tả                                  |
| ----------------------------------------------------- | -------------------------------------- |
| [UC35 — View Tag List](uc35-view-tags.md)             | Lấy danh sách tag ID để truyền vào     |
| [UC37 — Update Post Tags](uc37-update-post-tags.md)   | Replace toàn bộ tag của bài            |
| [UC34 — Create Tag](uc34-create-tag.md)               | Tạo tag mới trước khi thêm vào bài     |
| [UC9 — Create Post](uc09-create-post.md)              | Gắn tag khi tạo bài                    |
| [README](../README.md)                                | API Documentation Index                |
