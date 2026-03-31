# UC1 — View Categories

**Endpoint:** `GET /api/categories/`  
**Role:** Guest (no authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Trả về toàn bộ danh sách category kèm số bài viết.  
Không yêu cầu xác thực — bất kỳ ai cũng có thể gọi endpoint này.  
Không phân trang — trả về toàn bộ danh sách vì số lượng category thường nhỏ.

---

## 2. Business Rules

| #   | Rule                                                               |
| --- | ------------------------------------------------------------------ |
| BR1 | Không yêu cầu token — guest và user đều gọi được                   |
| BR2 | `posts_count` chỉ đếm bài `is_deleted=False`, không đếm bài đã xóa |
| BR3 | Trả về toàn bộ category, không lọc, không phân trang               |
| BR4 | Sắp xếp theo `name` tăng dần (A → Z)                               |
| BR5 | Category không có bài nào vẫn được trả về với `posts_count=0`      |

---

## 3. Request

### Headers

| Header          | Value           | Required       |
| --------------- | --------------- | -------------- |
| `Authorization` | `Token <token>` | Không bắt buộc |

### Request mẫu

```
GET /api/categories/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
```

### Query Parameters

Không có query parameter.

---

## 4. Processing Flow

1. **No Auth Check** — AllowAny permission, bỏ qua xác thực.
2. **Query Database** — `SELECT categories` + `COUNT posts WHERE is_deleted=False`, `ORDER BY name ASC`.
3. **Serialize & Return** — Serialize queryset → list → `200 OK`.

---

## 5. Database Operations

### Tables Affected

| Table      | Operation        | Note                       |
| ---------- | ---------------- | -------------------------- |
| `category` | SELECT           | Lấy toàn bộ category       |
| `post`     | COUNT (subquery) | Đếm bài theo từng category |

### Query (Django ORM)

```python
from django.db.models import Count, Q

Category.objects.annotate(
    posts_count=Count(
        "posts",
        filter=Q(posts__is_deleted=False)
    )
).order_by("name")
```

---

## 6. Response

### 200 OK

```json
[
  {
    "id": 1,
    "name": "Backend Development",
    "posts_count": 28,
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "Frontend Development",
    "posts_count": 15,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### 200 OK — Không có category nào

```json
[]
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân  | Cách fix                            |
| ----- | ------------ | ----------------------------------- |
| `500` | Lỗi database | Kiểm tra kết nối DB, xem server log |

> Endpoint này không có lỗi 400, 401, 403, 404 vì không nhận input và không yêu cầu xác thực.

---

## 8. Related Files

| File                                              | Mô tả                                              |
| ------------------------------------------------- | -------------------------------------------------- |
| [UC2 — View Posts](uc02-view-posts.md)            | Lấy danh sách bài viết, có thể lọc theo `category` |
| [UC6 — Search Posts](uc06-search-posts.md)        | Tìm kiếm bài, có thể giới hạn theo `category`      |
| [UC22 — Create Category](uc22-create-category.md) | Tạo category mới (Admin)                           |
| [UC23 — Update Category](uc23-update-category.md) | Cập nhật category (Admin)                          |
| [UC24 — Delete Category](uc24-delete-category.md) | Xóa category (Admin)                               |
| [README](../README.md)                            | API Documentation Index                            |
