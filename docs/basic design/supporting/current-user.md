# Current User

**Endpoint:** `GET /api/auth/me/` and `PATCH /api/auth/me/`

**Role:** User (authentication required)

---

## Xem thông tin bản thân [GET]

Trả về thông tin `request.user` — fields từ `django.contrib.auth.models.User`.

### Request

```
GET /api/auth/me/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Response 200 (application/json)

```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_active": true,
  "date_joined": "2024-01-15T08:30:00Z"
}
```

### Response 401 (application/json)

```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## Cập nhật thông tin bản thân [PATCH]

Chỉ cho phép cập nhật `first_name`, `last_name`.
Không cho phép đổi `username`, `email`, `is_active`, `is_staff`.

### Request (application/json)

```
PATCH /api/auth/me/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "first_name": "Johnny",
  "last_name": "Doe Jr"
}
```

### Response 200 (application/json)

```json
{
  "id": 1,
  "username": "johndoe",
  "first_name": "Johnny",
  "last_name": "Doe Jr"
}
```

### Response 400 (application/json)

```json
{
  "first_name": ["Ensure this field has no more than 100 characters."]
}
```

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
