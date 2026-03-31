# UC26 — Import Posts from CSV

**Endpoint:** `POST /api/admin/posts/import/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Import posts từ CSV

Nhập bài viết hàng loạt từ file CSV. Bỏ qua dòng lỗi, trả về thống kê.

CSV header bắt buộc: `title, content, category_name, author_username`

### Request (multipart/form-data)

```
POST /api/admin/posts/import/ HTTP/1.1
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
  "total_rows": 50,
  "imported": 47,
  "skipped": 3,
  "errors": [
    { "row": 5, "reason": "Category 'Unknown' does not exist." },
    { "row": 12, "reason": "Author 'nobody' does not exist." },
    { "row": 38, "reason": "title: This field may not be blank." }
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
- [UC27 — Export Posts to CSV](uc27-export-posts.md)
- [UC29 — Import Users from CSV](uc29-import-users.md)
