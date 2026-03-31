# UC4 — View Related Posts

**Endpoint:** `GET /api/posts/{id}/related/`  
**Role:** Guest (no authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Trả về danh sách bài viết cùng category với bài hiện tại, ngoại trừ chính bài đó.  
Không yêu cầu xác thực — bất kỳ ai cũng có thể gọi.  
Không phân trang — giới hạn số lượng qua query param `limit` (mặc định `4`).

---

## 2. Business Rules

| #   | Rule                                                             |
| --- | ---------------------------------------------------------------- |
| BR1 | Không yêu cầu token — guest và user đều gọi được                 |
| BR2 | Chỉ lấy bài cùng `category_id` với bài gốc và `is_deleted=False` |
| BR3 | Loại trừ bài hiện tại (`id` truyền vào)                          |
| BR4 | Sắp xếp theo `likes_count` giảm dần                              |
| BR5 | Số bài trả về tối đa bằng `limit` (default `4`, max `10`)        |
| BR6 | Nếu bài gốc không tồn tại hoặc đã bị xóa → trả về `404`          |
| BR7 | `thumbnail` lấy từ bảng `files` với `entity_type='post'`, `entity_id=post.id`, `status='active'`; nếu không có file nào thì trả về `null` |

---

## 3. Request

### Headers

| Header          | Value           | Required       |
| --------------- | --------------- | -------------- |
| `Authorization` | `Token <token>` | Không bắt buộc |

### Request mẫu

```
GET /api/posts/1/related/?limit=4 HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
```

### Path Parameters

| Param | Type    | Required | Mô tả           |
| ----- | ------- | -------- | --------------- |
| `id`  | integer | Yes      | Post ID bài gốc |

### Query Parameters

| Param   | Type    | Required | Default | Mô tả                   |
| ------- | ------- | -------- | ------- | ----------------------- |
| `limit` | integer | No       | `4`     | Số bài trả về. Max `10` |

---

## 4. Processing Flow

1. **No Auth Check** — AllowAny permission, bỏ qua xác thực.
2. **Fetch Post gốc** — `get_object_or_404(Post, pk=id, is_deleted=False)` → `404` nếu không tìm thấy.
3. **Query Related Posts** — Filter `category=post.category`, exclude `pk=id`, `is_deleted=False`, `ORDER BY likes_count DESC`, slice `[:limit]`, đồng thời prefetch `files` để lấy `thumbnail`.
4. **Serialize & Return** — Serialize list → `200 OK`.

---

## 5. Database Operations

### Tables Affected

| Table        | Operation | Note                                     |
| ------------ | --------- | ---------------------------------------- |
| `posts`      | SELECT    | Lấy bài gốc để xác định `category_id`    |
| `posts`      | SELECT    | Lấy bài liên quan, filter + sort + limit |
| `users`      | JOIN      | Thông tin tác giả                        |
| `categories` | JOIN      | Tên category                             |
| `files`      | Prefetch  | Lấy thumbnail: `entity_type='post'`, `entity_id=post.id`, `status='active'` |

### Query (Django ORM)

```python
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch
from apps.files.models import File

thumbnail_qs = File.objects.filter(
    entity_type="post",
    status="active",
)

# Lấy bài gốc
post = get_object_or_404(Post, pk=pk, is_deleted=False)

# Lấy bài liên quan
limit = min(int(request.query_params.get("limit", 4)), 10)
related = (
    Post.objects.filter(
        category=post.category,
        is_deleted=False,
    )
    .exclude(pk=post.pk)
    .select_related("author", "category")
    .prefetch_related(
        Prefetch(
            "files",
            queryset=thumbnail_qs,
            to_attr="thumbnail_files",
        )
    )
    .order_by("-likes_count")[:limit]
)
```

---

## 6. Response

### 200 OK

```json
[
  {
    "id": 3,
    "title": "Advanced Django ORM Techniques",
    "thumbnail": "https://cdn.blogproject.quanna.io.vn/posts/cover-drf.webp",
    "category": {
      "id": 2,
      "name": "Backend Development"
    },
    "author": {
      "id": 2,
      "username": "alice"
    },
    "likes_count": 35,
    "bookmarks_count": 8,
    "created_at": "2024-01-10T08:00:00Z"
  }
]
```

### 200 OK — Không có bài liên quan

```json
[]
```

### 404 Not Found

```json
{
  "detail": "Not found."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                          | Cách fix                            |
| ----- | ------------------------------------ | ----------------------------------- |
| `404` | Bài gốc không tồn tại hoặc đã bị xóa | Kiểm tra `id` và `is_deleted`       |
| `400` | `limit` không phải số nguyên hợp lệ  | Kiểm tra lại kiểu dữ liệu param     |
| `500` | Lỗi database                         | Kiểm tra kết nối DB, xem server log |

---

## 8. Related Files

| File                                               | Mô tả                   |
| -------------------------------------------------- | ----------------------- |
| [UC3 — View Post Detail](uc03-view-post-detail.md) | Chi tiết bài viết       |
| [UC2 — View Posts](uc02-view-posts.md)             | Danh sách bài viết      |
| [UC1 — View Categories](uc01-view-categories.md)   | Danh sách category      |
| [README](../README.md)                             | API Documentation Index |
