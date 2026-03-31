# UC30 — Ban User

**Endpoint:** `POST /api/admin/users/{id}/ban/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Ban user

Đặt `is_active = False`. User không đăng nhập được.
Token hiện tại không bị xóa ngay nhưng `obtain_auth_token` sẽ từ chối user bị ban.
Không thể ban chính mình hoặc Admin khác (`is_staff=True`).

### Parameters

- `id` (integer, required) - User ID (`django.contrib.auth.models.User.id`)

### Request

```
POST /api/admin/users/5/ban/ HTTP/1.1
Authorization: Token <admin_token>
```

### Response 200 (application/json)

```json
{
  "id": 5,
  "username": "baduser",
  "is_active": false,
  "detail": "User has been banned."
}
```

### Response 400 (application/json)

Cố ban chính mình, Admin khác, hoặc user đã bị ban.

```json
{
  "non_field_errors": ["You cannot ban yourself, another admin or banned user."]
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
- [UC31 — Unban User](uc31-unban-user.md)
