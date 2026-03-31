# UC28 — Export Users to CSV

**Endpoint:** `GET /api/admin/users/export/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Export users ra CSV

Xuất danh sách user ra file CSV.
Không export `password` (đã hash) — chỉ export metadata.

### Parameters

- `is_active` (boolean, optional) - Lọc theo trạng thái active
- `is_staff` (boolean, optional) - Lọc theo quyền staff
- `from` (string, optional) - Từ ngày đăng ký. Format: `YYYY-MM-DD`
- `to` (string, optional) - Đến ngày đăng ký. Format: `YYYY-MM-DD`

### Request

```
GET /api/admin/users/export/?is_active=true&from=2024-01-01 HTTP/1.1
Authorization: Token <admin_token>
```

### Response 200 (text/csv)

**Headers:**

```
Content-Disposition: attachment; filename="users_2026-03-23.csv"
Content-Type: text/csv
```

**Body:**

```csv
id,username,email,first_name,last_name,is_active,is_staff,date_joined
1,johndoe,john@example.com,John,Doe,True,False,2024-01-01T00:00:00Z
2,alice,alice@example.com,Alice,Smith,True,False,2024-01-05T00:00:00Z
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
- [UC27 — Export Posts to CSV](uc27-export-posts.md)
- [UC29 — Import Users from CSV](uc29-import-users.md)
