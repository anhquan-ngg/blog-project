# UC27 — Export Posts to CSV

**Endpoint:** `GET /api/admin/posts/export/`

**Role:** Admin (authentication required, `is_staff=True`)

---

## Export posts ra CSV

Xuất toàn bộ bài viết ra file CSV.
Trả về file download trực tiếp qua `HttpResponse(content_type="text/csv")`.

### Parameters

- `category` (integer, optional) - Lọc theo category ID
- `from` (string, optional) - Từ ngày tạo. Format: `YYYY-MM-DD`
- `to` (string, optional) - Đến ngày tạo. Format: `YYYY-MM-DD`

### Request

```
GET /api/admin/posts/export/?category=2&from=2024-01-01&to=2024-12-31 HTTP/1.1
Authorization: Token <admin_token>
```

### Response 200 (text/csv)

**Headers:**

```
Content-Disposition: attachment; filename="posts_2026-03-22.csv"
Content-Type: text/csv
```

**Body:**

```csv
id,title,slug,author,category,is_published,views_count,likes_count,created_at
1,Getting Started with DRF,getting-started-with-drf,johndoe,Backend,True,1250,47,2024-01-14T10:00:00Z
2,Advanced Serializers,advanced-serializers,johndoe,Backend,True,830,23,2024-01-10T08:00:00Z
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
- [UC26 — Import Posts from CSV](uc26-import-posts.md)
- [UC28 — Export Users to CSV](uc28-export-users.md)
