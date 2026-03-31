# UC30 — Ban User

**Endpoint:** `POST /api/admin/users/{id}/ban/`  
**Role:** Admin (authentication required, `is_staff=True`)  
**Last Updated:** 2026-03-30  
**Status:** Ready for implementation

---

## 1. Overview

Khóa tài khoản user bằng cách set `is_active = False`.  
Chỉ Admin (`is_staff=True`) mới có quyền thực hiện.  
User bị ban sẽ không thể đăng nhập — `obtain_auth_token` sẽ từ chối.  
Token hiện tại của user không bị xóa ngay nhưng sẽ vô hiệu hóa trong luồng authentication.  
**Không thể ban** chính mình, Admin khác, hoặc user đã bị ban.

---

## 2. Business Rules

| #   | Rule                                                                                    |
| --- | --------------------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                                     |
| BR2 | Chỉ Admin (`is_staff=True`) được ban user → `403` nếu không phải                        |
| BR3 | User không tồn tại → `404`                                                              |
| BR4 | Không thể ban chính mình (`request.user.id == target_user.id`) → `400`                  |
| BR5 | Không thể ban Admin khác (`target_user.is_staff=True`) → `400`                          |
| BR6 | Không thể ban user đã bị ban (`target_user.is_active=False`) → `400`                    |
| BR7 | Set `is_active = False` — user không đăng nhập được                                     |
| BR8 | Token hiện tại không bị xóa ngay — tùy thuộc vào middleware authentication               |
| BR9 | Trả về `200 OK` kèm thông tin user và message xác nhận                                  |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả                             |
| ----- | ------- | -------- | --------------------------------- |
| `id`  | integer | Yes      | User ID (`auth_user.id`)          |

### Body

Không có body.

### Request mẫu

```
POST /api/admin/users/5/ban/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token <admin_token>
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu token.
2. **Permission Check** — `IsAdminUser` (is_staff=True) → `403` nếu không phải Admin.
3. **Fetch User** — `get_object_or_404(User, pk=id)` → `404` nếu không tìm thấy.
4. **Self-Ban Check** — `request.user.id == target.id` → `400`.
5. **Admin Ban Check** — `target.is_staff=True` → `400`.
6. **Already Banned Check** — `target.is_active=False` → `400`.
7. **Apply Ban** — `target.is_active = False`, `target.save()`.
8. **Return Response** — `200 OK` kèm thông tin user.

---

## 5. Database Operations

### Tables Affected

| Table       | Operation | Note                                   |
| ----------- | --------- | -------------------------------------- |
| `auth_user` | SELECT    | Lấy user theo `pk`                     |
| `auth_user` | UPDATE    | Set `is_active=False`                  |

### Query (Django ORM)

```python
from django.contrib.auth.models import User

target = get_object_or_404(User, pk=pk)

# Permission validations
if target.id == request.user.id:
    raise ValidationError("You cannot ban yourself, another admin or banned user.")
if target.is_staff:
    raise ValidationError("You cannot ban yourself, another admin or banned user.")
if not target.is_active:
    raise ValidationError("You cannot ban yourself, another admin or banned user.")

# Apply ban
target.is_active = False
target.save(update_fields=["is_active"])
```

---

## 6. Response

### 200 OK

```json
{
  "id": 5,
  "username": "baduser",
  "is_active": false,
  "detail": "User has been banned."
}
```

### 400 Bad Request — Cố ban chính mình, Admin khác, hoặc user đã bị ban

```json
{
  "non_field_errors": ["You cannot ban yourself, another admin or banned user."]
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

| HTTP  | Nguyên nhân                                           | Cách fix                                         |
| ----- | ----------------------------------------------------- | ------------------------------------------------ |
| `400` | Cố ban chính mình                                     | Không thể ban tài khoản của chính mình           |
| `400` | Cố ban Admin khác                                     | Không thể ban tài khoản có `is_staff=True`        |
| `400` | User đã bị ban trước đó (`is_active=False`)           | User đã ban rồi, không cần ban lại               |
| `401` | Thiếu token                                           | Thêm header `Authorization: Token <token>`       |
| `403` | Không phải Admin                                      | Dùng tài khoản có `is_staff=True`                |
| `404` | User không tồn tại                                    | Kiểm tra `id` hợp lệ                             |
| `500` | Lỗi database                                          | Kiểm tra kết nối DB, xem server log              |

---

## 8. Related Files

| File                                             | Mô tả                              |
| ------------------------------------------------ | ---------------------------------- |
| [UC31 — Unban User](uc31-unban-user.md)          | Mở khóa tài khoản user             |
| [UC28 — Export Users to CSV](uc28-export-users.md)| Xuất danh sách user ra CSV        |
| [UC29 — Import Users from CSV](uc29-import-users.md)| Import user từ CSV              |
| [README](../README.md)                           | API Documentation Index            |
