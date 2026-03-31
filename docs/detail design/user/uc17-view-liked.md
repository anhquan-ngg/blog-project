# UC17 — View Liked Posts

**Endpoint:** `GET /api/me/liked/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Trả về danh sách bài viết mà user hiện tại đã like.  
Sắp xếp theo thời gian like mới nhất lên đầu.  
Có phân trang với `limit` / `offset`.

---

## 2. Business Rules

| #   | Rule                                                                     |
| --- | ------------------------------------------------------------------------ |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới xem được danh sách của mình   |
| BR2 | Chỉ trả về bài của `request.user` đã like                                |
| BR3 | Chỉ trả về bài có `is_deleted=False`                                     |
| BR4 | Sắp xếp theo thời gian like mới nhất (`likes__created_at` DESC)          |
| BR5 | Phân trang `limit` (default `10`, max `100`) / `offset` (default `0`)   |
| BR6 | `is_liked` luôn là `true` trong response này                              |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Request mẫu

```
GET /api/me/liked/?limit=10&offset=0 HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Query Parameters

| Param    | Type    | Required | Default | Mô tả                        |
| -------- | ------- | -------- | ------- | ---------------------------- |
| `limit`  | integer | No       | `10`    | Số item mỗi trang. Max `100` |
| `offset` | integer | No       | `0`     | Số item bỏ qua               |

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table        | Operation | Note                                           |
| ------------ | --------- | ---------------------------------------------- |
| `likes`      | JOIN      | Filter theo `user_id = request.user.id`        |
| `posts`      | SELECT    | Lấy bài, lọc `is_deleted=False`                |
| `users`      | JOIN      | Thông tin tác giả bài                          |
| `categories` | JOIN      | Tên category                                   |

### Query (Django ORM)

```python
qs = Post.objects.filter(
    likes__user=request.user,
    is_deleted=False,
).select_related("author", "category").order_by("-likes__created_at")
```

---

## 6. Response

### 200 OK

```json
{
  "count": 12,
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
      "likes_count": 48,
      "bookmarks_count": 12,
      "is_liked": true,
      "is_bookmarked": false,
      "created_at": "2024-01-14T10:00:00Z"
    }
  ]
}
```

### 200 OK — Chưa like bài nào

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

### 401 Unauthorized

```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân          | Cách fix                                   |
| ----- | -------------------- | ------------------------------------------ |
| `401` | Thiếu token          | Thêm header `Authorization: Token <token>` |
| `500` | Lỗi database         | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                              | Mô tả                         |
| ------------------------------------------------- | ----------------------------- |
| [UC15/16 — Like/Unlike Post](uc15-16-like-unlike.md) | Toggle like                |
| [UC20 — View Bookmarks](uc20-view-bookmarks.md)   | Danh sách bài đã bookmark     |
| [README](../README.md)                            | API Documentation Index       |
