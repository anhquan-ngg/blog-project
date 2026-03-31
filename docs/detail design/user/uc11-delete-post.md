# UC11 — Delete Post

**Endpoint:** `DELETE /api/posts/{id}/`  
**Role:** User (owner only) / Admin (any post)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Xóa mềm bài viết bằng cách set `is_deleted=True` và ghi lại `deleted_at`.  
User chỉ xóa được bài của chính mình.  
Admin có thể xóa bài của bất kỳ ai.  
Bài sau khi xóa sẽ không xuất hiện trong bất kỳ API GET nào.

---

## 2. Business Rules

| #   | Rule                                                                      |
| --- | ------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                        |
| BR2 | User thường chỉ xóa được bài của chính mình → `403` nếu không phải chủ   |
| BR3 | Admin (`is_staff=True`) có thể xóa bất kỳ bài nào                        |
| BR4 | Bài không tồn tại hoặc đã `is_deleted=True` → `404`                      |
| BR5 | Xóa mềm: set `is_deleted=True`, `deleted_at=now()` — không xóa khỏi DB   |
| BR6 | Trả về `204 No Content` khi thành công                                    |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả   |
| ----- | ------- | -------- | ------- |
| `id`  | integer | Yes      | Post ID |

### Request mẫu

```
DELETE /api/posts/1/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu.
2. **Fetch Post** — `get_object_or_404(Post, pk=id, is_deleted=False)` → `404` nếu không tìm thấy.
3. **Permission Check** — `is_staff` → OK; `request.user == post.author` → OK; else → `403`.
4. **Soft Delete** — `post.is_deleted = True`, `post.deleted_at = now()`, `post.save()`.
5. **Return Response** — `204 No Content`.

---

## 5. Database Operations

### Tables Affected

| Table   | Operation | Note                                          |
| ------- | --------- | --------------------------------------------- |
| `posts` | SELECT    | Lấy bài theo `pk`, kiểm tra `is_deleted=False` |
| `posts` | UPDATE    | Set `is_deleted=True`, `deleted_at=now()`     |

### Query (Django ORM)

```python
from django.utils import timezone

post = get_object_or_404(Post, pk=pk, is_deleted=False)

# Soft delete
post.is_deleted = True
post.deleted_at = timezone.now()
post.save(update_fields=["is_deleted", "deleted_at"])
```

---

## 6. Response

### 204 No Content

*(Không có body)*

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

| HTTP  | Nguyên nhân                        | Cách fix                                   |
| ----- | ---------------------------------- | ------------------------------------------ |
| `401` | Thiếu token                        | Thêm header `Authorization: Token <token>` |
| `403` | Không phải chủ bài và không phải admin | Chỉ `author` hoặc `is_staff` mới được xóa |
| `404` | Bài không tồn tại hoặc đã xóa      | Kiểm tra `id` và trạng thái bài           |
| `500` | Lỗi database                       | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                          | Mô tả                              |
| --------------------------------------------- | ---------------------------------- |
| [UC9 — Create Post](uc09-create-post.md)      | Tạo bài viết                       |
| [UC10 — Update Post](uc10-update-post.md)     | Cập nhật bài viết                  |
| [README](../README.md)                        | API Documentation Index            |
