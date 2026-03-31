# UC7 — Sign Up

**Endpoint:** `POST /api/auth/register/`  
**Role:** Guest (no authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Tạo tài khoản người dùng mới bằng `User.objects.create_user()`.  
Không tự động trả về token — user cần đăng nhập riêng sau khi đăng ký (UC8).  
Validate toàn bộ input phía backend trước khi lưu DB.

---

## 2. Business Rules

| #   | Rule                                                                     |
| --- | ------------------------------------------------------------------------ |
| BR1 | Không yêu cầu token — guest gọi endpoint này                             |
| BR2 | `username` phải unique, 3–50 ký tự, chỉ chứa chữ/số/`@`/`.`/`_`/`-`   |
| BR3 | `email` phải unique và đúng định dạng email                              |
| BR4 | `password` tối thiểu 8 ký tự, tối đa 50 ký tự, có ít nhất 1 chữ và 1 số |
| BR5 | `password_confirm` phải khớp với `password`                              |
| BR6 | `first_name` và `last_name` tối đa 100 ký tự                            |
| BR7 | Sau khi tạo thành công, trả về `201` kèm thông tin user (không có token) |

---

## 3. Request

### Headers

| Header         | Value              | Required   |
| -------------- | ------------------ | ---------- |
| `Content-Type` | `application/json` | Bắt buộc   |

### Request mẫu

```
POST /api/auth/register/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "password_confirm": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe"
}
```

### Body Parameters

| Field              | Type   | Required | Mô tả                                              |
| ------------------ | ------ | -------- | -------------------------------------------------- |
| `username`         | string | **Yes**  | Unique, 3–50 ký tự, chỉ chứa chữ/số/@/./\_/-      |
| `email`            | string | **Yes**  | Địa chỉ email hợp lệ, unique trong hệ thống        |
| `password`         | string | **Yes**  | 8–50 ký tự, có ít nhất 1 chữ và 1 số              |
| `password_confirm` | string | **Yes**  | Phải khớp với `password`                           |
| `first_name`       | string | No       | Tối đa 100 ký tự                                   |
| `last_name`        | string | No       | Tối đa 100 ký tự                                   |

---

## 4. Processing Flow

1. **No Auth Check** — AllowAny permission, bỏ qua xác thực.
2. **Validate Input** — Kiểm tra field bắt buộc, định dạng `username`/`email`, password rules, `password == password_confirm`, unique `username`/`email` → `400` nếu lỗi.
3. **Create User** — `User.objects.create_user(...)`, password tự động được hash.
4. **Serialize & Return** — Serialize user vừa tạo → `201 Created`.

---

## 5. Database Operations

### Tables Affected

| Table   | Operation | Note                                         |
| ------- | --------- | -------------------------------------------- |
| `users` | SELECT    | Kiểm tra unique `username` và `email`        |
| `users` | INSERT    | Tạo user mới, `password` được lưu dạng hash |

### Query (Django ORM)

```python
# Kiểm tra unique (được xử lý tự động bởi serializer validate)
User.objects.filter(username=data["username"]).exists()
User.objects.filter(email=data["email"]).exists()

# Tạo user
user = User.objects.create_user(
    username   = data["username"],
    email      = data["email"],
    password   = data["password"],
    first_name = data.get("first_name", ""),
    last_name  = data.get("last_name", ""),
)
```

---

## 6. Response

### 201 Created

```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "date_joined": "2024-01-15T08:30:00Z"
}
```

### 400 Bad Request — Validation lỗi

```json
{
  "username": ["A user with that username already exists."],
  "email": ["This email is already registered."],
  "password": ["Password must be 8–50 characters and contain at least one letter and one digit."],
  "non_field_errors": ["Passwords do not match."]
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                               | Cách fix                                           |
| ----- | ----------------------------------------- | -------------------------------------------------- |
| `400` | `username` hoặc `email` đã tồn tại        | Dùng username/email khác                           |
| `400` | `password` không đủ mạnh                  | Đảm bảo 8–50 ký tự, có chữ và số                  |
| `400` | `password_confirm` không khớp             | Nhập lại cho khớp `password`                       |
| `400` | Field bắt buộc bị thiếu                   | Bổ sung `username`, `email`, `password`, `password_confirm` |
| `500` | Lỗi database                              | Kiểm tra kết nối DB, xem server log                |

---

## 8. Related Files

| File                           | Mô tả                             |
| ------------------------------ | ---------------------------------- |
| [UC8 — Log In](uc08-log-in.md) | Đăng nhập sau khi đăng ký         |
| [README](../README.md)         | API Documentation Index            |
