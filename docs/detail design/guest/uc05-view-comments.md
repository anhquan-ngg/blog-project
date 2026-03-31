# UC5 — View Comments

**Endpoint:** `GET /api/posts/{post_id}/comments/`  
**Role:** Guest (no authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Trả về danh sách bình luận cấp 1 (top-level) của một bài viết, kèm replies lồng bên trong.  
Không yêu cầu xác thực — bất kỳ ai cũng có thể xem.  
Có phân trang với `limit` / `offset`. Replies không phân trang — luôn trả về toàn bộ.

---

## 2. Business Rules

| #   | Rule                                                                              |
| --- | --------------------------------------------------------------------------------- |
| BR1 | Không yêu cầu token — guest và user đều gọi được                                  |
| BR2 | Chỉ trả về comment có `is_deleted=False`                                          |
| BR3 | Chỉ lấy comment cấp 1 (`parent_id IS NULL`) ở danh sách chính                     |
| BR4 | Replies (`parent_id IS NOT NULL`) được nest trong field `replies` của comment cha |
| BR5 | Phân trang theo `limit` (default `20`, max `100`) và `offset` (default `0`)       |
| BR6 | Sắp xếp theo `created_at` tăng dần (cũ nhất lên đầu)                              |
| BR7 | Bài viết không tồn tại hoặc đã bị xóa → `404`                                     |

---

## 3. Request

### Headers

| Header          | Value           | Required       |
| --------------- | --------------- | -------------- |
| `Authorization` | `Token <token>` | Không bắt buộc |

### Request mẫu

```
GET /api/posts/1/comments/?limit=20&offset=0 HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
```

### Path Parameters

| Param     | Type    | Required | Mô tả   |
| --------- | ------- | -------- | ------- |
| `post_id` | integer | Yes      | Post ID |

### Query Parameters

| Param    | Type    | Required | Default | Mô tả                                 |
| -------- | ------- | -------- | ------- | ------------------------------------- |
| `limit`  | integer | No       | `20`    | Số comment cấp 1 mỗi trang. Max `100` |
| `offset` | integer | No       | `0`     | Số comment bỏ qua                     |

---

## 4. Processing Flow

1. **No Auth Check** — AllowAny permission, bỏ qua xác thực.
2. **Verify Post Exists** — `get_object_or_404(Post, pk=post_id, is_deleted=False)` → `404` nếu không tìm thấy.
3. **Query Top-level Comments** — Filter `post_id`, `parent_id=None`, `is_deleted=False`; Prefetch replies (`is_deleted=False`); `ORDER BY created_at ASC`.
4. **Paginate** — `LimitOffsetPagination`.
5. **Serialize & Return** — Serialize với nested replies → `200 OK`.

---

## 5. Database Operations

### Tables Affected

| Table      | Operation | Note                                       |
| ---------- | --------- | ------------------------------------------ |
| `posts`    | SELECT    | Xác nhận bài tồn tại, `is_deleted=False`   |
| `comments` | SELECT    | Lấy comment cấp 1 (`parent_id IS NULL`)    |
| `comments` | SELECT    | Prefetch replies (`parent_id IS NOT NULL`) |
| `users`    | JOIN      | Thông tin tác giả comment                  |

### Query (Django ORM)

```python
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404

# Xác nhận bài tồn tại
post = get_object_or_404(Post, pk=post_id, is_deleted=False)

# Prefetch replies
replies_qs = Comment.objects.filter(
    is_deleted=False
).select_related("author").order_by("created_at")

# Top-level comments
qs = Comment.objects.filter(
    post=post,
    parent_id__isnull=True,
    is_deleted=False,
).select_related("author").prefetch_related(
    Prefetch("replies", queryset=replies_qs)
).order_by("created_at")
```

---

## 6. Response

### 200 OK

```json
{
  "count": 18,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "content": "Great article! Very helpful.",
      "author": {
        "id": 3,
        "username": "alice"
      },
      "replies": [
        {
          "id": 5,
          "content": "Glad you liked it!",
          "author": {
            "id": 1,
            "username": "johndoe"
          },
          "created_at": "2024-01-15T10:00:00Z",
          "updated_at": "2024-01-15T10:00:00Z"
        }
      ],
      "created_at": "2024-01-15T09:30:00Z",
      "updated_at": "2024-01-15T09:30:00Z"
    }
  ]
}
```

### 200 OK — Không có comment nào

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
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

| HTTP  | Nguyên nhân                          | Cách fix                            |
| ----- | ------------------------------------ | ----------------------------------- |
| `404` | Bài không tồn tại hoặc đã bị xóa mềm | Kiểm tra `post_id` và `is_deleted`  |
| `500` | Lỗi database                         | Kiểm tra kết nối DB, xem server log |

---

## 8. Related Files

| File                                                    | Mô tả                   |
| ------------------------------------------------------- | ----------------------- |
| [UC3 — View Post Detail](uc03-view-post-detail.md)      | Chi tiết bài viết       |
| [UC12 — Create Comment](../user/uc12-create-comment.md) | Đăng bình luận          |
| [UC13 — Update Comment](../user/uc13-update-comment.md) | Cập nhật bình luận      |
| [UC14 — Delete Comment](../user/uc14-delete-comment.md) | Xóa bình luận           |
| [README](../README.md)                                  | API Documentation Index |
