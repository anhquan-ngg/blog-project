# UC18 & UC19 — Bookmark / Unbookmark Post

**Endpoint:** `POST /api/posts/{id}/bookmark/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Toggle bookmark/unbookmark bài viết bằng một endpoint duy nhất.  
Gọi lần 1 → bookmark (UC18). Gọi lần 2 → unbookmark (UC19).  
`bookmarks_count` trên bảng `posts` được cập nhật đồng thời (denormalized counter).

---

## 2. Business Rules

| #   | Rule                                                                       |
| --- | -------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới bookmark được                    |
| BR2 | Bài viết phải tồn tại và `is_deleted=False` → `404` nếu không             |
| BR3 | Toggle: gọi lần 1 → tạo `Bookmark` record; gọi lần 2 → xóa `Bookmark` record |
| BR4 | `bookmarks_count` trên bảng `posts` tăng/giảm 1 tương ứng                  |
| BR5 | Dùng `get_or_create` + `F() expression` để tránh race condition             |
| BR6 | Trả về `200 OK` cùng trạng thái `bookmarked` và `bookmarks_count` mới     |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả   |
| ----- | ------- | -------- | ------- |
| `id`  | integer | Yes      | Post ID |

### Request mẫu

```
POST /api/posts/1/bookmark/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

*(Không có body)*

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table       | Operation     | Note                                            |
| ----------- | ------------- | ----------------------------------------------- |
| `posts`     | SELECT        | Xác nhận bài tồn tại, `is_deleted=False`        |
| `bookmarks` | SELECT/INSERT | get_or_create Bookmark record                   |
| `bookmarks` | DELETE        | Xóa Bookmark record khi unbookmark              |
| `posts`     | UPDATE        | Cập nhật `bookmarks_count` bằng `F()` expression |

### Query (Django ORM)

```python
from django.db.models import F

post = get_object_or_404(Post, pk=pk, is_deleted=False)
bookmark, created = Bookmark.objects.get_or_create(user=request.user, post=post)

if created:
    Post.objects.filter(pk=post.pk).update(bookmarks_count=F("bookmarks_count") + 1)
    bookmarked = True
else:
    bookmark.delete()
    Post.objects.filter(pk=post.pk).update(bookmarks_count=F("bookmarks_count") - 1)
    bookmarked = False

post.refresh_from_db(fields=["bookmarks_count"])
```

---

## 6. Response

### 200 OK — UC18 (Bookmark)

```json
{
  "bookmarked": true,
  "bookmarks_count": 13
}
```

### 200 OK — UC19 (Unbookmark)

```json
{
  "bookmarked": false,
  "bookmarks_count": 12
}
```

### 401 Unauthorized

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 404 Not Found

```json
{
  "detail": "Not found."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                       | Cách fix                                   |
| ----- | --------------------------------- | ------------------------------------------ |
| `401` | Thiếu token                       | Thêm header `Authorization: Token <token>` |
| `404` | Bài không tồn tại hoặc đã bị xóa  | Kiểm tra `id` và trạng thái bài           |
| `500` | Lỗi database / race condition      | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                              | Mô tả                          |
| ------------------------------------------------- | ------------------------------ |
| [UC20 — View Bookmarks](uc20-view-bookmarks.md)   | Danh sách bài đã bookmark      |
| [UC15/16 — Like/Unlike](uc15-16-like-unlike.md)   | Toggle like (tương tự)         |
| [UC3 — View Post Detail](../guest/uc03-view-post-detail.md) | Xem `is_bookmarked` trong detail |
| [README](../README.md)                            | API Documentation Index        |
