# UC32 — Log Out

**Endpoint:** `POST /api/auth/logout/`

**Role:** User (authentication required)

---

## Đăng xuất

Xóa token khỏi database (`Token.objects.filter(user=request.user).delete()`).
Các request dùng token cũ sau đó sẽ nhận 401.

### Request

```
POST /api/auth/logout/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Response 204

No content (success).

### Response 401 (application/json)

```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC8 — Log In](../guest/uc08-log-in.md)
