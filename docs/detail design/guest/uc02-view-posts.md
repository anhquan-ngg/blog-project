# UC2 — View Posts

**Endpoint:** `GET /api/posts/`  
**Role:** Guest (no authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Trả về danh sách bài viết kèm số like, số bookmark.  
Không yêu cầu xác thực — bất kỳ ai cũng có thể gọi endpoint này.  
Có phân trang với `limit` / `offset`. Hỗ trợ lọc theo `category`, `author`, `tag` và sắp xếp linh hoạt.

---

## 2. Business Rules

| #   | Rule                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR1 | Không yêu cầu token — guest và user đều gọi được                                                                                                  |
| BR2 | Chỉ trả về bài có `is_deleted=False`                                                                                                              |
| BR3 | Phân trang với `limit` (default `10`, max `100`) và `offset` (default `0`)                                                                        |
| BR4 | Sắp xếp theo `ordering` param; mặc định `-created_at` (mới nhất lên đầu)                                                                          |
| BR5 | `likes_count` và `bookmarks_count` lấy trực tiếp từ field đã được denormalize trên bảng `post`                                                    |
| BR6 | `is_liked` / `is_bookmarked` = `false` với guest; với user đã đăng nhập thì kiểm tra thực tế                                                      |
| BR7 | `thumbnail` lấy từ bảng `files` với `entity_type='post'`, `entity_id=post.id`, `status='active'`; nếu không có file nào thì trả về `null`         |

---

## 3. Request

### Headers

| Header          | Value           | Required       |
| --------------- | --------------- | -------------- |
| `Authorization` | `Token <token>` | Không bắt buộc |

### Request mẫu

```
GET /api/posts/?limit=10&offset=0 HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
```

### Query Parameters

| Param      | Type    | Required | Default       | Mô tả                                                      |
| ---------- | ------- | -------- | ------------- | ---------------------------------------------------------- |
| `limit`    | integer | No       | `10`          | Số item mỗi trang. Max `100`                               |
| `offset`   | integer | No       | `0`           | Số item bỏ qua                                             |
| `category` | integer | No       | —             | Lọc theo `category_id`                                     |
| `author`   | integer | No       | —             | Lọc theo `author_id`                                       |
| `tag`      | string  | No       | —             | Lọc theo `tag slug`                                        |
| `ordering` | string  | No       | `-created_at` | `created_at`, `-created_at`, `likes_count`, `-likes_count` |

---

## 4. Processing Flow

1. **No Auth Check** — AllowAny permission, bỏ qua xác thực.
2. **Build Queryset** — Filter `is_deleted=False`, apply `category` / `author` / `tag` filter, apply `ordering`.
3. **Paginate** — `LimitOffsetPagination`.
4. **Serialize & Return** — Serialize page results → `200 OK`.

---

## 5. Database Operations

### Tables Affected

| Table        | Operation | Note                                                                              |
| ------------ | --------- | --------------------------------------------------------------------------------- |
| `posts`      | SELECT    | Lấy danh sách bài, lọc `is_deleted=False`                                         |
| `users`      | JOIN      | Lấy thông tin tác giả                                                             |
| `categories` | JOIN      | Lấy tên category                                                                  |
| `post_tags`  | JOIN      | Lọc theo tag (nếu có param `tag`)                                                 |
| `tags`       | JOIN      | Lấy thông tin tag                                                                 |
| `likes`      | subquery  | Kiểm tra `is_liked` (nếu user đăng nhập)                                          |
| `bookmarks`  | subquery  | Kiểm tra `is_bookmarked` (nếu user đăng nhập)                                     |
| `files`      | Prefetch  | Lấy thumbnail: `entity_type='post'`, `entity_id=post.id`, `status='active'`      |

### Query (Django ORM)

```python
from django.db.models import Exists, OuterRef, Prefetch
from apps.files.models import File

thumbnail_qs = File.objects.filter(
    entity_type="post",
    status="active",
)

qs = Post.objects.filter(is_deleted=False).select_related(
    "author", "category"
).prefetch_related(
    "tags",
    Prefetch(
        "files",
        queryset=thumbnail_qs,
        to_attr="thumbnail_files",
    ),
)

# Filter
if category_id:
    qs = qs.filter(category_id=category_id)
if author_id:
    qs = qs.filter(author_id=author_id)
if tag_slug:
    qs = qs.filter(tags__slug=tag_slug)

# is_liked / is_bookmarked
if request.user.is_authenticated:
    qs = qs.annotate(
        is_liked=Exists(Like.objects.filter(post=OuterRef("pk"), user=request.user)),
        is_bookmarked=Exists(Bookmark.objects.filter(post=OuterRef("pk"), user=request.user)),
    )

qs = qs.order_by(ordering)

# Trong serializer, lấy thumbnail:
# thumbnail = instance.thumbnail_files[0].url if instance.thumbnail_files else None
```

---

## 6. Response

### 200 OK

```json
{
  "count": 45,
  "next": "https://api.blogproject.quanna.io.vn/api/posts/?limit=10&offset=10",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Getting Started with Django REST Framework",
      "thumbnail": "https://cdn.blogproject.quanna.io.vn/posts/cover-drf.webp",
      "category": {
        "id": 2,
        "name": "Backend Development"
      },
      "author": {
        "id": 1,
        "username": "johndoe"
      },
      "tags": [{ "id": 1, "name": "Django", "slug": "django" }],
      "likes_count": 47,
      "bookmarks_count": 12,
      "is_liked": false,
      "is_bookmarked": false,
      "created_at": "2024-01-14T10:00:00Z"
    }
  ]
}
```

### 200 OK — Không có bài nào

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                             | Cách fix                              |
| ----- | --------------------------------------- | ------------------------------------- |
| `400` | `limit` / `offset` không phải số nguyên | Kiểm tra lại kiểu dữ liệu query param |
| `500` | Lỗi database                            | Kiểm tra kết nối DB, xem server log   |

---

## 8. Related Files

| File                                               | Mô tả                                |
| -------------------------------------------------- | ------------------------------------ |
| [UC1 — View Categories](uc01-view-categories.md)   | Lấy danh sách category để filter bài |
| [UC3 — View Post Detail](uc03-view-post-detail.md) | Xem chi tiết bài viết                |
| [UC6 — Search Posts](uc06-search-posts.md)         | Tìm kiếm bài viết toàn văn           |
| [UC9 — Create Post](../user/uc09-create-post.md)   | Tạo bài viết mới                     |
| [README](../README.md)                             | API Documentation Index              |
