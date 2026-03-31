# UC7 — Sign Up

**Endpoint:** `POST /api/auth/register/`

**Role:** Guest (no authentication required)

---

## Đăng ký tài khoản

Tạo tài khoản mới bằng `User.objects.create_user()`.
Không tự động trả về token — user cần đăng nhập riêng sau khi đăng ký (UC8).

### Request (application/json)

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "password_confirm": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe"
}
```

### Parameters

- `username` (string, required) - Unique, 3-50 ký tự, chỉ chữ/số/@/. /\_
- `email` (string, required) - Địa chỉ email hợp lệ, unique trong hệ thống
- `password` (string, required) - Tối thiểu 8 ký tự, có chữ và số
- `password_confirm` (string, required) - Phải khớp với `password`
- `first_name` (string, optional) - Tối đa 100 ký tự
- `last_name` (string, optional) - Tối đa 100 ký tự

### Response 201 (application/json)

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

### Response 400 (application/json)

Thiếu field hoặc không hợp lệ.

```json
{
  "username": ["A user with that username already exists."],
  "email": ["This email is already registered."],
  "non_field_errors": ["Passwords do not match."]
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC8 — Log In](uc08-log-in.md)
