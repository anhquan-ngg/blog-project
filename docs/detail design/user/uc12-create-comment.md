# UC12 — Create Comment

**Endpoint:** `POST /api/posts/{post_id}/comments/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Đăng bình luận cho một bài viết. Hỗ trợ cả comment cấp 1 (top-level) và reply (cấp 2).  
Tính năng hỗ trợ người dùng đính kèm 1 ảnh vào comment thông qua `file_id`. 
`author` tự động gán từ `request.user`.  
Bài viết không tồn tại hoặc đã xóa → `404`.

---

## 2. Business Rules

| #   | Rule                                                                        |
| --- | --------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới bình luận được                   |
| BR2 | Bài viết phải tồn tại và `is_deleted=False` → `404` nếu không              |
| BR3 | `content` là bắt buộc, không được để trống                                  |
| BR4 | `parent_id` là tùy chọn; nếu truyền vào phải là comment hợp lệ của cùng bài|
| BR5 | Chỉ hỗ trợ 2 cấp: comment cấp 1 và reply (không nested sâu hơn)            |
| BR6 | `author` gán tự động từ `request.user`, không nhận từ request body          |
| BR7 | `file_id` (tùy chọn) dùng để gắn ảnh. File phải tồn tại trong bảng `files` |

---

## 3. Request

### Headers

| Header          | Value              | Required |
| --------------- | ------------------ | -------- |
| `Authorization` | `Token <token>`    | Bắt buộc |
| `Content-Type`  | `application/json` | Bắt buộc |

### Path Parameters

| Param     | Type    | Required | Mô tả   |
| --------- | ------- | -------- | ------- |
| `post_id` | integer | Yes      | Post ID |

### Request mẫu — Comment cấp 1

```
POST /api/posts/1/comments/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "content": "This is a great explanation!",
  "file_id": 99
}
```

### Request mẫu — Reply (cấp 2)

```
POST /api/posts/1/comments/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "content": "Totally agree with you!",
  "parent_id": 5
}
```

### Body Parameters

| Field       | Type    | Required | Mô tả                                                       |
| ----------- | ------- | -------- | ----------------------------------------------------------- |
| `content`   | string  | **Yes**  | Nội dung bình luận                                          |
| `parent_id` | integer | No       | ID comment cha nếu là reply; `null` nếu là comment cấp 1   |
| `file_id`   | integer | No       | ID của file ảnh cần đính kèm (nếu có)                       |

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401`.
2. **Validate Input** — Trích xuất `content`, `parent_id`, và `file_id`. Return `400` nếu lỗi dữ liệu.
3. **Create Comment** — Gọi ORM tạo comment mới, gán post và author.
4. **Attach File Image** — Nếu có `file_id`, update db bảng `files` cập nhật `entity_type='comment'`, `entity_id` và `status='active'`.
5. **Serialize & Return** → `201 Created`.

---

## 5. Database Operations

### Tables Affected

| Table      | Operation | Note                                              |
| ---------- | --------- | ------------------------------------------------- |
| `posts`    | SELECT    | Xác nhận bài tồn tại, `is_deleted=False`          |
| `comments` | SELECT    | Kiểm tra `parent_id` hợp lệ (nếu truyền)         |
| `comments` | INSERT    | Tạo comment mới                                   |
| `files`    | UPDATE    | Gắn ảnh vào comment, đổi entity_type và entity_id |

### Query (Django ORM)

```python
post = get_object_or_404(Post, pk=post_id, is_deleted=False)

comment = Comment.objects.create(
    post      = post,
    author    = request.user,
    content   = validated_data["content"],
    parent_id = validated_data.get("parent_id"),  # None nếu top-level
)

# Gắn file ảnh nếu có truyền lên
file_id = validated_data.get("file_id")
if file_id:
    File.objects.filter(pk=file_id).update(
        entity_type="comment",
        entity_id=comment.pk,
        status="active"
    )
```

---

## 6. Response

### 201 Created

```json
{
  "id": 42,
  "content": "This is a great explanation!",
  "author": {
    "id": 5,
    "username": "bob"
  },
  "image_url": "https://cdn.blogproject.quanna.io.vn/comments/anh_dinh_kem.png",
  "parent_id": null,
  "created_at": "2024-01-16T09:00:00Z",
  "updated_at": "2024-01-16T09:00:00Z"
}
```

### 400 Bad Request — Validation lỗi

```json
{
  "content": ["This field is required."]
}
```

### 400 Bad Request — `parent_id` không hợp lệ

```json
{
  "parent_id": ["Invalid pk \"999\" - object does not exist."]
}
```

### 401 Unauthorized

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 404 Not Found — Bài viết không tồn tại

```json
{
  "detail": "Not found."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                            | Cách fix                                   |
| ----- | -------------------------------------- | ------------------------------------------ |
| `400` | `content` bị thiếu hoặc trống          | Bổ sung `content`                          |
| `400` | `parent_id` không tồn tại hoặc sai bài | Dùng `parent_id` hợp lệ trong cùng bài     |
| `401` | Thiếu token                            | Thêm header `Authorization: Token <token>` |
| `404` | Bài viết không tồn tại hoặc đã xóa     | Kiểm tra `post_id`                         |
| `500` | Lỗi database                           | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                                  | Mô tả                          |
| ----------------------------------------------------- | ------------------------------ |
| [UC5 — View Comments](../guest/uc05-view-comments.md) | Xem danh sách bình luận        |
| [UC13 — Update Comment](uc13-update-comment.md)       | Cập nhật bình luận             |
| [UC14 — Delete Comment](uc14-delete-comment.md)       | Xóa bình luận                  |
| [README](../README.md)                                | API Documentation Index        |
