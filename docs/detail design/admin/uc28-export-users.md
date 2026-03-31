# UC28 — Export Users to CSV

**Endpoint:** `GET /api/admin/users/export/`  
**Role:** Admin (authentication required, `is_staff=True`)  
**Last Updated:** 2026-03-30  
**Status:** Ready for implementation

---

## 1. Overview

Xuất danh sách user ra file CSV để tải về.  
Chỉ Admin (`is_staff=True`) mới có quyền thực hiện.  
**Không xuất `password`** (đã hash) — chỉ export metadata người dùng.  
Hỗ trợ lọc theo `is_active`, `is_staff`, `from` và `to` (ngày đăng ký).

---

## 2. Business Rules

| #   | Rule                                                                               |
| --- | ---------------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                                |
| BR2 | Chỉ Admin (`is_staff=True`) được export → `403` nếu không phải                    |
| BR3 | Không bao giờ export field `password` dù đã hash                                  |
| BR4 | `is_active` (optional) — lọc theo trạng thái. Nhận `true` / `false`               |
| BR5 | `is_staff` (optional) — lọc theo quyền admin. Nhận `true` / `false`               |
| BR6 | `from` (optional) — lọc user đăng ký từ ngày này. Format: `YYYY-MM-DD`            |
| BR7 | `to` (optional) — lọc user đăng ký đến ngày này. Format: `YYYY-MM-DD`             |
| BR8 | `from` và `to` không hợp lệ → `400`                                               |
| BR9 | Tên file theo format `users_YYYY-MM-DD.csv` (ngày export)                         |
| BR10| Encode UTF-8 với BOM (`utf-8-sig`) để Excel mở đúng                               |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Query Parameters

| Param       | Type    | Required | Mô tả                                     |
| ----------- | ------- | -------- | ----------------------------------------- |
| `is_active` | boolean | No       | Lọc theo trạng thái active (`true`/`false`) |
| `is_staff`  | boolean | No       | Lọc theo quyền admin (`true`/`false`)       |
| `from`      | string  | No       | Từ ngày đăng ký. Format: `YYYY-MM-DD`       |
| `to`        | string  | No       | Đến ngày đăng ký. Format: `YYYY-MM-DD`      |

### Request mẫu

```
GET /api/admin/users/export/?is_active=true&from=2024-01-01 HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token <admin_token>
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu token.
2. **Permission Check** — `IsAdminUser` (is_staff=True) → `403` nếu không phải Admin.
3. **Parse & Validate Query Params** — Validate `from`, `to` đúng format `YYYY-MM-DD`, validate `is_active`/`is_staff` là boolean → `400` nếu sai.
4. **Build Queryset** — Filter `User.objects.all()`, áp dụng `is_active`, `is_staff`, `from`, `to` nếu có.
5. **Generate CSV** — Stream queryset ra CSV writer theo thứ tự cột đã định (không bao gồm `password`).
6. **Return File** — `HttpResponse` với `Content-Type: text/csv` và `Content-Disposition: attachment`.

---

## 5. Database Operations

### Tables Affected

| Table       | Operation | Note                                              |
| ----------- | --------- | ------------------------------------------------- |
| `auth_user` | SELECT    | Lấy user theo filter, không lấy field `password`  |

### Query (Django ORM)

```python
from django.contrib.auth.models import User
from django.utils.dateparse import parse_date

queryset = User.objects.all().order_by("id")

if is_active := request.query_params.get("is_active"):
    queryset = queryset.filter(is_active=(is_active.lower() == "true"))

if is_staff := request.query_params.get("is_staff"):
    queryset = queryset.filter(is_staff=(is_staff.lower() == "true"))

if from_date := request.query_params.get("from"):
    queryset = queryset.filter(date_joined__date__gte=parse_date(from_date))

if to_date := request.query_params.get("to"):
    queryset = queryset.filter(date_joined__date__lte=parse_date(to_date))

# Export (không include password)
fields = ["id", "username", "email", "first_name", "last_name", "is_active", "is_staff", "date_joined"]
```

---

## 6. Response

### 200 OK — File CSV

**Response Headers:**

```
Content-Disposition: attachment; filename="users_2026-03-30.csv"
Content-Type: text/csv; charset=utf-8
```

**Response Body (CSV):**

```csv
id,username,email,first_name,last_name,is_active,is_staff,date_joined
1,johndoe,john@example.com,John,Doe,True,False,2024-01-01T00:00:00Z
2,alice,alice@example.com,Alice,Smith,True,False,2024-01-05T00:00:00Z
```

### 200 OK — Không có user nào thỏa điều kiện lọc

**Response Body (CSV):**

```csv
id,username,email,first_name,last_name,is_active,is_staff,date_joined
```

*(Chỉ có header, không có dòng dữ liệu)*

### 400 Bad Request — Sai format ngày

```json
{
  "from": ["Invalid date format. Use YYYY-MM-DD."]
}
```

### 400 Bad Request — Sai giá trị boolean

```json
{
  "is_active": ["Value must be 'true' or 'false'."]
}
```

### 401 Unauthorized

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden

```json
{
  "detail": "You do not have permission to perform this action."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                              | Cách fix                                       |
| ----- | ---------------------------------------- | ---------------------------------------------- |
| `400` | `from` hoặc `to` sai format             | Dùng format `YYYY-MM-DD` (ví dụ: 2024-01-15)  |
| `400` | `is_active` / `is_staff` không phải boolean | Dùng `true` hoặc `false`                   |
| `401` | Thiếu token                              | Thêm header `Authorization: Token <token>`    |
| `403` | Không phải Admin                         | Dùng tài khoản có `is_staff=True`             |
| `500` | Lỗi database hoặc generate CSV           | Kiểm tra kết nối DB, xem server log           |

---

## 8. Related Files

| File                                                  | Mô tả                              |
| ----------------------------------------------------- | ---------------------------------- |
| [UC27 — Export Posts to CSV](uc27-export-posts.md)    | Xuất bài viết ra CSV               |
| [UC29 — Import Users from CSV](uc29-import-users.md)  | Import user từ CSV                 |
| [UC30 — Ban User](uc30-ban-user.md)                   | Khóa tài khoản user                |
| [README](../README.md)                                | API Documentation Index            |
