# UC14 — Delete Comment

**Endpoint:** `DELETE /api/comments/{id}/`  
**Role:** User (owner only) / Admin (any comment)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Xóa mềm bình luận bằng cách set `is_deleted=True` và ghi lại `deleted_at`.  
Chỉ chủ bình luận hoặc Admin mới được xóa.  
Comment sau khi xóa sẽ không hiển thị trong UC5.

---

## 2. Business Rules

| #   | Rule                                                                      |
| --- | ------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                        |
| BR2 | User thường chỉ xóa được comment của chính mình → `403` nếu không phải chủ |
| BR3 | Admin (`is_staff=True`) có thể xóa bất kỳ comment nào                    |
| BR4 | Comment không tồn tại hoặc đã `is_deleted=True` → `404`                  |
| BR5 | Xóa mềm: set `is_deleted=True`, `deleted_at=now()` — không xóa khỏi DB   |
| BR6 | Replies của comment bị xóa vẫn giữ nguyên trong DB (không cascade)        |
| BR7 | Trả về `204 No Content` khi thành công                                    |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả      |
| ----- | ------- | -------- | ---------- |
| `id`  | integer | Yes      | Comment ID |

### Request mẫu

```
DELETE /api/comments/42/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table      | Operation | Note                                             |
| ---------- | --------- | ------------------------------------------------ |
| `comments` | SELECT    | Lấy comment theo `pk`, kiểm tra `is_deleted=False` |
| `comments` | UPDATE    | Set `is_deleted=True`, `deleted_at=now()`        |

### Query (Django ORM)

```python
from django.utils import timezone

comment = get_object_or_404(Comment, pk=pk, is_deleted=False)

# Soft delete
comment.is_deleted = True
comment.deleted_at = timezone.now()
comment.save(update_fields=["is_deleted", "deleted_at"])
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

| HTTP  | Nguyên nhân                                | Cách fix                                     |
| ----- | ------------------------------------------ | -------------------------------------------- |
| `401` | Thiếu token                                | Thêm header `Authorization: Token <token>`   |
| `403` | Không phải chủ comment và không phải admin | Chỉ `author` hoặc `is_staff` mới được xóa   |
| `404` | Comment không tồn tại hoặc đã xóa          | Kiểm tra `id` và trạng thái comment          |
| `500` | Lỗi database                               | Kiểm tra kết nối DB, xem server log          |

---

## 8. Related Files

| File                                                  | Mô tả                       |
| ----------------------------------------------------- | --------------------------- |
| [UC12 — Create Comment](uc12-create-comment.md)       | Tạo bình luận               |
| [UC13 — Update Comment](uc13-update-comment.md)       | Cập nhật bình luận          |
| [UC5 — View Comments](../guest/uc05-view-comments.md) | Xem danh sách bình luận     |
| [README](../README.md)                                | API Documentation Index     |
