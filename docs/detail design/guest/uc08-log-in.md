# UC8 — Log In

**Endpoint:** `POST /api/auth/login/`  
**Role:** Guest (no authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Xác thực người dùng và trả về Token DRF.  
Sử dụng `obtain_auth_token` của DRF — 1 user chỉ có 1 token tại 1 thời điểm.  
Token được lưu trong bảng `authtoken_token` và dùng cho tất cả request cần xác thực.

---

## 2. Business Rules

| #   | Rule                                                                 |
| --- | -------------------------------------------------------------------- |
| BR1 | Không yêu cầu token — guest gọi để nhận token                        |
| BR2 | `username` và `password` đều bắt buộc                                |
| BR3 | Nếu `username`/`password` sai hoặc tài khoản bị ban → `400`         |
| BR4 | Tài khoản bị ban (`is_active=False`) → trả về `400` (không phân biệt với sai mật khẩu) |
| BR5 | Mỗi user chỉ có 1 token; gọi lại sẽ trả về token cũ                 |

---

## 3. Request

### Headers

| Header         | Value              | Required |
| -------------- | ------------------ | -------- |
| `Content-Type` | `application/json` | Bắt buộc |

### Request mẫu

```
POST /api/auth/login/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePass123"
}
```

### Body Parameters

| Field      | Type   | Required | Mô tả              |
| ---------- | ------ | -------- | ------------------ |
| `username` | string | **Yes**  | Tên đăng nhập      |
| `password` | string | **Yes**  | Mật khẩu tài khoản |

---

## 4. Processing Flow

1. **No Auth Check** — AllowAny permission, bỏ qua xác thực đầu vào.
2. **Validate Input** — `username` và `password` bắt buộc → `400` nếu thiếu.
3. **Authenticate** — `authenticate(username, password)` → `None` nếu sai hoặc `is_active=False` → `400`.
4. **Get or Create Token** — `Token.objects.get_or_create(user=user)`.
5. **Return Token** — `200 OK` `{"token": "..."}`.

---

## 5. Database Operations

### Tables Affected

| Table             | Operation    | Note                                    |
| ----------------- | ------------ | --------------------------------------- |
| `users`           | SELECT       | Tìm user theo `username`, kiểm tra `is_active` |
| `authtoken_token` | SELECT/INSERT | Lấy hoặc tạo token cho user             |

### Query (Django ORM)

```python
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token

user = authenticate(username=username, password=password)
# user là None nếu sai credentials hoặc is_active=False

token, _ = Token.objects.get_or_create(user=user)
```

---

## 6. Response

### 200 OK

```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
}
```

### 400 Bad Request — Sai credentials hoặc tài khoản bị ban

```json
{
  "non_field_errors": ["Unable to log in with provided credentials."]
}
```

### 400 Bad Request — Thiếu field

```json
{
  "username": ["This field is required."],
  "password": ["This field is required."]
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                                | Cách fix                                     |
| ----- | ------------------------------------------ | -------------------------------------------- |
| `400` | Sai `username` hoặc `password`             | Kiểm tra lại thông tin đăng nhập             |
| `400` | Tài khoản bị ban (`is_active=False`)        | Liên hệ admin để mở khóa tài khoản           |
| `400` | Thiếu `username` hoặc `password`            | Bổ sung đủ 2 field                           |
| `500` | Lỗi database                               | Kiểm tra kết nối DB, xem server log          |

> Endpoint này không phân biệt lỗi "sai mật khẩu" và "tài khoản bị ban" để tránh lộ thông tin.

---

## 8. Related Files

| File                                      | Mô tả                                 |
| ----------------------------------------- | -------------------------------------- |
| [UC7 — Sign Up](uc07-sign-up.md)          | Đăng ký tài khoản trước khi đăng nhập |
| [UC32 — Log Out](../user/uc32-log-out.md) | Xóa token khi đăng xuất              |
| [README](../README.md)                    | API Documentation Index               |
