# UC6 — Search Posts

**Endpoint:** `GET /api/posts/search/`  
**Role:** Guest (no authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Tìm kiếm bài viết theo từ khóa trong `title` và `content` (full-text `icontains`).  
Không yêu cầu xác thực — bất kỳ ai cũng có thể tìm kiếm.  
Có phân trang. Hỗ trợ giới hạn phạm vi tìm theo `category`.

---

## 2. Business Rules

| #   | Rule                                                                   |
| --- | ---------------------------------------------------------------------- |
| BR1 | Không yêu cầu token — guest và user đều gọi được                       |
| BR2 | Param `q` là bắt buộc; tối thiểu 2 ký tự sau khi strip                |
| BR3 | Tìm kiếm case-insensitive (`icontains`) trên cả `title` và `content`  |
| BR4 | Chỉ tìm trong bài có `is_deleted=False`                                |
| BR5 | Hỗ trợ lọc thêm theo `category` (category_id)                         |
| BR6 | Phân trang `limit` (default `10`, max `100`) / `offset` (default `0`) |
| BR7 | Sắp xếp theo `-created_at` (mặc định)                                  |

---

## 3. Request

### Headers

| Header          | Value           | Required       |
| --------------- | --------------- | -------------- |
| `Authorization` | `Token <token>` | Không bắt buộc |

### Request mẫu

```
GET /api/posts/search/?q=django&limit=10&offset=0 HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
```

### Query Parameters

| Param      | Type    | Required | Default      | Mô tả                                           |
| ---------- | ------- | -------- | ------------ | ----------------------------------------------- |
| `q`        | string  | **Yes**  | —            | Từ khóa tìm kiếm, tối thiểu 2 ký tự            |
| `limit`    | integer | No       | `10`         | Số item mỗi trang. Max `100`                    |
| `offset`   | integer | No       | `0`          | Số item bỏ qua                                  |
| `category` | integer | No       | —            | Giới hạn tìm trong `category_id`                |

---

## 4. Processing Flow

1. **No Auth Check** — AllowAny permission, bỏ qua xác thực.
2. **Validate Params** — `q` bắt buộc, `len(q.strip()) >= 2` → `400` nếu thiếu hoặc quá ngắn.
3. **Build Queryset** — Filter `is_deleted=False`, `Q(title__icontains=q) | Q(content__icontains=q)`, filter `category` nếu có, `ORDER BY -created_at`.
4. **Paginate** — `LimitOffsetPagination`.
5. **Serialize & Return** — Serialize kết quả → `200 OK`.

---

## 5. Database Operations

### Tables Affected

| Table        | Operation | Note                                     |
| ------------ | --------- | ---------------------------------------- |
| `posts`      | SELECT    | Filter `icontains` trên `title`/`content` |
| `users`      | JOIN      | Thông tin tác giả                        |
| `categories` | JOIN      | Tên category                             |

### Query (Django ORM)

```python
from django.db.models import Q

q           = request.query_params.get("q", "").strip()
category_id = request.query_params.get("category")

qs = Post.objects.filter(
    Q(title__icontains=q) | Q(content__icontains=q),
    is_deleted=False,
).select_related("author", "category")

if category_id:
    qs = qs.filter(category_id=category_id)

qs = qs.order_by("-created_at")
```

---

## 6. Response

### 200 OK

```json
{
  "count": 8,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Getting Started with Django REST Framework",
      "category": {
        "id": 2,
        "name": "Backend Development"
      },
      "author": {
        "id": 1,
        "username": "johndoe"
      },
      "likes_count": 47,
      "bookmarks_count": 12,
      "created_at": "2024-01-14T10:00:00Z"
    }
  ]
}
```

### 200 OK — Không có kết quả

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

### 400 Bad Request — Thiếu `q`

```json
{
  "q": ["This field is required."]
}
```

### 400 Bad Request — `q` quá ngắn

```json
{
  "q": ["Search query must be at least 2 characters."]
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                      | Cách fix                                |
| ----- | -------------------------------- | --------------------------------------- |
| `400` | Thiếu `q` hoặc `q` dưới 2 ký tự | Truyền đúng `q` với ít nhất 2 ký tự    |
| `500` | Lỗi database                     | Kiểm tra kết nối DB, xem server log     |

---

## 8. Related Files

| File                                             | Mô tả                         |
| ------------------------------------------------ | ----------------------------- |
| [UC2 — View Posts](uc02-view-posts.md)           | Danh sách bài viết kèm filter |
| [UC1 — View Categories](uc01-view-categories.md) | Lấy category để lọc kết quả  |
| [README](../README.md)                           | API Documentation Index       |
