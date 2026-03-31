# UC13 — Update Comment

**Endpoint:** `PATCH /api/comments/{id}/`  
**Role:** User (owner only)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Cập nhật nội dung bình luận (`content`) hoặc chỉnh sửa ảnh đính kèm (`file_id`).  
Chỉ chủ bình luận (`author`) mới được sửa — không phải admin.  
Chỉ cho phép cập nhật tối đa 2 trường trên; các field khác không thể sửa qua API này.

---

## 2. Business Rules

| #   | Rule                                                                   |
| --- | ---------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                     |
| BR2 | Chỉ `author` của comment mới được sửa → `403` nếu không phải chủ sở hữu |
| BR3 | Comment không tồn tại hoặc `is_deleted=True` → `404`                   |
| BR4 | Chỉ cho phép cập nhật `content` hoặc/và `file_id`; field khác bị bỏ qua |
| BR5 | `content` không được để trống (nếu có truyền lên)                      |
| BR6 | `updated_at` tự động cập nhật khi lưu                                  |
| BR7 | Truyền `file_id` để đổi ảnh; truyền tham số `file_id: null` để gỡ ảnh  |

---

## 3. Request

### Headers

| Header          | Value              | Required |
| --------------- | ------------------ | -------- |
| `Authorization` | `Token <token>`    | Bắt buộc |
| `Content-Type`  | `application/json` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả      |
| ----- | ------- | -------- | ---------- |
| `id`  | integer | Yes      | Comment ID |

### Request mẫu

```
PATCH /api/comments/42/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "content": "Updated comment content.",
  "file_id": 100
}
```

### Body Parameters

| Field     | Type    | Required | Mô tả                                  |
| --------- | ------- | -------- | -------------------------------------- |
| `content` | string  | **No**   | Nội dung mới, không để trống (nếu gửi) |
| `file_id` | integer | **No**   | ID ảnh mới; gửi `null` để gỡ ảnh       |

---

## 4. Processing Flow

1. **Auth Check** — Lấy user object, throw `401` nếu vô danh.
2. **Fetch Comment** — Fetch DB theo `pk`, validate `author` (`403`) và `is_deleted` (`404`).
3. **Validate Param** — Lấy `content`, `file_id` từ input; ném lỗi nếu rỗng sai quy định.
4. **Update Content** — Thay content và `updated_at`.
5. **Sync Image Mapping** — Nếu có gửi khóa `file_id`, gỡ liên kết entity cũ giữa file gốc và comment, sau đó cập nhật entity info vào file mới (nếu gửi id).
6. **Serialize & Return** → Trả về record HTTP `200`.

---

## 5. Database Operations

### Tables Affected

| Table      | Operation | Note                                         |
| ---------- | --------- | -------------------------------------------- |
| `comments` | SELECT    | Lấy comment theo `pk`, kiểm tra `is_deleted` |
| `comments` | UPDATE    | Cập nhật `content`, `updated_at`             |
| `files`    | UPDATE    | Tranh thủ gỡ/cập nhật quan hệ mapping DB ảnh |

### Query (Django ORM)

```python
comment = get_object_or_404(Comment, pk=pk, is_deleted=False)

# Cập nhật content
if "content" in validated_data:
    comment.content = validated_data["content"]
comment.save(update_fields=["content", "updated_at"])

# Đồng bộ file_id
if "file_id" in validated_data:
    new_file_id = validated_data["file_id"]
    
    # Detach ảnh cũ (nếu có)
    File.objects.filter(entity_type="comment", entity_id=comment.pk).update(
        entity_type=None, 
        entity_id=None
        # (hoặc update status="deleted" tùy cơ chế dọn rác System của bạn)
    )
    
    # Link ảnh mới
    if new_file_id is not None:
        File.objects.filter(pk=new_file_id).update(
            entity_type="comment",
            entity_id=comment.pk,
            status="active"
        )
```

---

## 6. Response

### 200 OK

```json
{
  "id": 42,
  "content": "Updated comment content.",
  "author": {
    "id": 5,
    "username": "bob"
  },
  "image_url": "https://cdn.blogproject.quanna.io.vn/comments/new_upload.png",
  "parent_id": null,
  "created_at": "2024-01-16T09:00:00Z",
  "updated_at": "2024-01-16T10:30:00Z"
}
```

### 400 Bad Request

```json
{
  "content": ["This field may not be blank."]
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

| HTTP  | Nguyên nhân                           | Cách fix                                   |
| ----- | ------------------------------------- | ------------------------------------------ |
| `400` | `content` trống hoặc bị thiếu        | Truyền `content` hợp lệ                    |
| `401` | Thiếu token                           | Thêm header `Authorization: Token <token>` |
| `403` | Không phải chủ bình luận              | Chỉ `author` mới được sửa                 |
| `404` | Comment không tồn tại hoặc đã xóa     | Kiểm tra `id` và trạng thái comment        |
| `500` | Lỗi database                          | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                                  | Mô tả                      |
| ----------------------------------------------------- | -------------------------- |
| [UC12 — Create Comment](uc12-create-comment.md)       | Tạo bình luận              |
| [UC14 — Delete Comment](uc14-delete-comment.md)       | Xóa bình luận              |
| [UC5 — View Comments](../guest/uc05-view-comments.md) | Xem danh sách bình luận    |
| [README](../README.md)                                | API Documentation Index    |
