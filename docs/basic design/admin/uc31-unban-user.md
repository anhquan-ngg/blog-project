# UC31 — Unban User

**Endpoint:** `POST /api/admin/users/{id}/unban/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Unban user

Đặt lại `is_active = True`. User có thể đăng nhập trở lại.

### Parameters

- `id` (integer, required) - User ID

### Request

```
POST /api/admin/users/5/unban/ HTTP/1.1
Authorization: Token <admin_token>
```

### Response 200 (application/json)

```json
{
  "id": 5,
  "username": "baduser",
  "is_active": true,
  "detail": "User has been unbanned."
}
```

### Response 400 (application/json)

User đang active, không cần unban.

```json
{
  "non_field_errors": ["User is already active."]
}
```

### Response 403 (application/json)

```json
{
  "detail": "You do not have permission to perform this action."
}
```

### Response 404 (application/json)

```json
{
  "detail": "Not found."
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC30 — Ban User](uc30-ban-user.md)
