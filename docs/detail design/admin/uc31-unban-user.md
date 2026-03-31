# UC31 — Unban User

**Endpoint:** `POST /api/admin/users/{id}/unban/`  
**Role:** Admin (authentication required, `is_staff=True`)  
**Last Updated:** 2026-03-30  
**Status:** Ready for implementation

---

## 1. Overview

Mở khóa tài khoản user đã bị ban bằng cách set `is_active = True`.  
Chỉ Admin (`is_staff=True`) mới có quyền thực hiện.  
Sau khi unban, user có thể đăng nhập và hoạt động bình thường trở lại.  
Không thể unban user đang `is_active=True` (tức chưa bị ban).

---

## 2. Business Rules

| #   | Rule                                                                          |
| --- | ----------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                           |
| BR2 | Chỉ Admin (`is_staff=True`) được unban user → `403` nếu không phải            |
| BR3 | User không tồn tại → `404`                                                    |
| BR4 | Không thể unban user đang `is_active=True` (chưa bị ban) → `400`              |
| BR5 | Set `is_active = True` — user có thể đăng nhập trở lại                        |
| BR6 | Trả về `200 OK` kèm thông tin user và message xác nhận                         |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả                    |
| ----- | ------- | -------- | ------------------------ |
| `id`  | integer | Yes      | User ID (`auth_user.id`) |

### Body

Không có body.

### Request mẫu

```
POST /api/admin/users/5/unban/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token <admin_token>
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu token.
2. **Permission Check** — `IsAdminUser` (is_staff=True) → `403` nếu không phải Admin.
3. **Fetch User** — `get_object_or_404(User, pk=id)` → `404` nếu không tìm thấy.
4. **Already Active Check** — `target.is_active=True` → `400` (user không bị ban).
5. **Apply Unban** — `target.is_active = True`, `target.save()`.
6. **Return Response** — `200 OK` kèm thông tin user.

---

## 5. Database Operations

### Tables Affected

| Table       | Operation | Note                                  |
| ----------- | --------- | ------------------------------------- |
| `auth_user` | SELECT    | Lấy user theo `pk`                    |
| `auth_user` | UPDATE    | Set `is_active=True`                  |

### Query (Django ORM)

```python
from django.contrib.auth.models import User

target = get_object_or_404(User, pk=pk)

# Validation
if target.is_active:
    raise ValidationError("User is already active.")

# Apply unban
target.is_active = True
target.save(update_fields=["is_active"])
```

---

## 6. Response

### 200 OK

```json
{
  "id": 5,
  "username": "baduser",
  "is_active": true,
  "detail": "User has been unbanned."
}
```

### 400 Bad Request — User đang active, không cần unban

```json
{
  "non_field_errors": ["User is already active."]
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

| HTTP  | Nguyên nhân                                      | Cách fix                                       |
| ----- | ------------------------------------------------ | ---------------------------------------------- |
| `400` | User đang `is_active=True` (chưa bị ban)         | User chưa bị ban, không cần unban              |
| `401` | Thiếu token                                      | Thêm header `Authorization: Token <token>`     |
| `403` | Không phải Admin                                 | Dùng tài khoản có `is_staff=True`              |
| `404` | User không tồn tại                               | Kiểm tra `id` hợp lệ                           |
| `500` | Lỗi database                                     | Kiểm tra kết nối DB, xem server log            |

---

## 8. Related Files

| File                                                  | Mô tả                              |
| ----------------------------------------------------- | ---------------------------------- |
| [UC30 — Ban User](uc30-ban-user.md)                   | Khóa tài khoản user                |
| [UC28 — Export Users to CSV](uc28-export-users.md)    | Xuất danh sách user ra CSV         |
| [UC29 — Import Users from CSV](uc29-import-users.md)  | Import user từ CSV                 |
| [README](../README.md)                                | API Documentation Index            |
