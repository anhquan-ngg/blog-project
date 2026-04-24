# UC27 — Export Posts to CSV

**Endpoint:** `GET /api/admin/posts/export/`  
**Role:** Admin (authentication required, `is_staff=True`)  
**Last Updated:** 2026-04-16  
**Status:** Ready for implementation

---

## 1. Overview

Xuất toàn bộ (hoặc đã lọc) danh sách bài viết ra file CSV để tải về.  
Chỉ Admin (`is_staff=True`) mới có quyền thực hiện.  
Hỗ trợ lọc theo `category`, `from` (ngày bắt đầu), `to` (ngày kết thúc).  
**Return File** — `StreamingHttpResponse` với `Content-Type: text/csv` và `Content-Disposition: attachment`.
  
CSV hiện tại bao gồm thêm các trường hiển thị phục vụ moderation như `tags`, `content`, `likes_count`, `bookmarks_count`.

---

## 2. Business Rules

| #   | Rule                                                                              |
| --- | --------------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                               |
| BR2 | Chỉ Admin (`is_staff=True`) được export → `403` nếu không phải                   |
| BR3 | Không bao gồm bài đã xóa mềm (`is_deleted=True`)                                 |
| BR4 | `category` (optional) — lọc theo category ID                                     |
| BR5 | `from` (optional) — lọc bài tạo từ ngày này trở đi. Format: `YYYY-MM-DD`         |
| BR6 | `to` (optional) — lọc bài tạo đến ngày này. Format: `YYYY-MM-DD`                |
| BR7 | `from` và `to` không hợp lệ → `400`                                              |
| BR8 | Tên file trả về theo format `posts_YYYY-MM-DD-HH-MM-SS.csv` (timestamp lúc export) |
| BR9 | Encode UTF-8 với BOM (`utf-8-sig`) để Excel mở đúng tiếng Việt                   |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Query Parameters

| Param      | Type    | Required | Mô tả                                 |
| ---------- | ------- | -------- | ------------------------------------- |
| `category` | integer | No       | Lọc theo Category ID                  |
| `from`     | string  | No       | Từ ngày tạo. Format: `YYYY-MM-DD`     |
| `to`       | string  | No       | Đến ngày tạo. Format: `YYYY-MM-DD`    |

### Request mẫu

```
GET /api/admin/posts/export/?category=2&from=2024-01-01&to=2024-12-31 HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token <admin_token>
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu token.
2. **Permission Check** — `IsAdminUser` (is_staff=True) → `403` nếu không phải Admin.
3. **Parse & Validate Query Params** — Validate `from`, `to` đúng format `YYYY-MM-DD` → `400` nếu sai.
4. **Build Queryset** — Filter `is_deleted=False`, áp dụng `category`, `from`, `to` nếu có.
5. **Generate CSV** — Stream queryset ra CSV writer theo thứ tự cột đã định (bao gồm JSON `content` đã resolve URL ảnh).
6. **Return File** — `HttpResponse` với `Content-Type: text/csv` và `Content-Disposition: attachment`.

---

## 5. Database Operations

### Tables Affected

| Table      | Operation | Note                                                   |
| ---------- | --------- | ------------------------------------------------------ |
| `posts`     | SELECT    | Lấy bài theo filter, chỉ `is_deleted=False`              |
| `category`  | JOIN      | Lấy tên category                                         |
| `auth_user` | JOIN      | Lấy username của tác giả                                 |
| `tags`      | JOIN      | Lấy danh sách tag của bài                                |
| `post_images` | SELECT  | Resolve URL ảnh trong block `content` kiểu `image`       |

### Query (Django ORM)

```python
from django.utils.dateparse import parse_date

queryset = Post.objects.filter(is_deleted=False).order_by("id")

if category_id := request.query_params.get("category"):
    queryset = queryset.filter(category_id=category_id)

if from_date := request.query_params.get("from"):
    queryset = queryset.filter(created_at__date__gte=parse_date(from_date))

if to_date := request.query_params.get("to"):
    queryset = queryset.filter(created_at__date__lte=parse_date(to_date))

# CSV fields currently exported:
# id, title, author_username, category_name, tags, content,
# likes_count, bookmarks_count, created_at
```

---

## 6. Response

### 200 OK — File CSV

**Response Headers:**

```
Content-Disposition: attachment; filename="posts_2026-04-16-14-30-45.csv"
Content-Type: text/csv; charset=utf-8-sig
```

**Response Body (CSV):**

```csv
id,title,author_username,category_name,tags,content,likes_count,bookmarks_count,created_at
1,Getting Started with DRF,johndoe,Backend,"drf, tutorial","[{""type"":""paragraph"",""data"":{""text"":""Hello""}}]",47,12,2024-01-14T10:00:00Z
2,Advanced Serializers,johndoe,Backend,"drf, advanced","[{""type"":""image"",""data"":{""url"":""/media/files/img.jpg""}}]",23,9,2024-01-10T08:00:00Z
```

### 200 OK — Không có bài nào thỏa điều kiện lọc

**Response Body (CSV):**

```csv
id,title,author_username,category_name,tags,content,likes_count,bookmarks_count,created_at
```

*(Chỉ có header, không có dòng dữ liệu)*

### 400 Bad Request — Sai format ngày

```json
{
  "from": ["Invalid date format. Use YYYY-MM-DD."]
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

| HTTP  | Nguyên nhân                       | Cách fix                                     |
| ----- | --------------------------------- | -------------------------------------------- |
| `400` | `from` hoặc `to` sai format       | Dùng format `YYYY-MM-DD` (ví dụ: 2024-01-15) |
| `401` | Thiếu token                       | Thêm header `Authorization: Token <token>`   |
| `403` | Không phải Admin                  | Dùng tài khoản có `is_staff=True`            |
| `500` | Lỗi database hoặc generate CSV    | Kiểm tra kết nối DB, xem server log          |

---

## 8. Related Files

| File                                                  | Mô tả                              |
| ----------------------------------------------------- | ---------------------------------- |
| [UC26 — Import Posts from CSV](uc26-import-posts.md)  | Import bài viết từ CSV             |
| [UC28 — Export Users to CSV](uc28-export-users.md)    | Xuất danh sách user ra CSV         |
| [README](../README.md)                                | API Documentation Index            |
