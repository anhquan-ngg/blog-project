# UC8 — Log In

**Endpoint:** `POST /api/auth/login/`

**Role:** Guest (no authentication required)

---

## Đăng nhập

Sử dụng `obtain_auth_token` của DRF. Trả về token dùng cho các request tiếp theo.
Token được lưu trong bảng `authtoken_token`. 1 user chỉ có 1 token tại 1 thời điểm.

### Request (application/json)

```json
{
  "username": "johndoe",
  "password": "SecurePass123"
}
```

### Parameters

- `username` (string, required)
- `password` (string, required)

### Response 200 (application/json)

```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4"
}
```

### Response 400 (application/json)

Sai username hoặc password, hoặc tài khoản bị ban (`is_active=False`).

```json
{
  "non_field_errors": ["Unable to log in with provided credentials."]
}
```

---

## Usage

Sử dụng token này cho các request tiếp theo:

```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC7 — Sign Up](uc07-sign-up.md)
- [UC32 — Log Out](../user/uc32-log-out.md)
