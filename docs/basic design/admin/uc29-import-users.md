# UC29 — Import Users from CSV

**Endpoint:** `POST /api/admin/users/import/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Import users từ CSV

Tạo user hàng loạt từ file CSV bằng `User.objects.create_user()`.

CSV header bắt buộc: `username, email, password, first_name, last_name`

### Request (multipart/form-data)

```
POST /api/admin/users/import/ HTTP/1.1
Authorization: Token <admin_token>
Content-Type: multipart/form-data

{
  "file": <csv_file>
}
```

### Parameters

- `file` (file, required) - File CSV, tối đa 10MB

### Response 200 (application/json)

```json
{
  "total_rows": 30,
  "imported": 28,
  "skipped": 2,
  "errors": [
    {
      "row": 7,
      "reason": "username: A user with that username already exists."
    },
    { "row": 19, "reason": "email: Enter a valid email address." }
  ]
}
```

### Response 400 (application/json)

```json
{
  "file": ["Only CSV files are accepted."]
}
```

### Response 403 (application/json)

```json
{
  "detail": "You do not have permission to perform this action."
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC28 — Export Users to CSV](uc28-export-users.md)
- [UC26 — Import Posts from CSV](uc26-import-posts.md)
