# UC15 & UC16 — Like / Unlike Post

**Endpoint:** `POST /api/posts/{id}/like/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Toggle like/unlike bài viết bằng một endpoint duy nhất.  
Gọi lần 1 → like (UC15). Gọi lần 2 → unlike (UC16).  
`likes_count` trên bảng `posts` được cập nhật đồng thời (denormalized counter).

---

## 2. Business Rules

| #   | Rule                                                                     |
| --- | ------------------------------------------------------------------------ |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới like được                      |
| BR2 | Bài viết phải tồn tại và `is_deleted=False` → `404` nếu không           |
| BR3 | Toggle: gọi lần 1 → tạo `Like` record; gọi lần 2 → xóa `Like` record    |
| BR4 | `likes_count` trên bảng `posts` tăng/giảm 1 tương ứng                    |
| BR5 | Dùng `get_or_create` + `F() expression` để tránh race condition           |
| BR6 | User không thể like bài của chính mình *(optional — tùy business)*        |
| BR7 | Trả về `200 OK` cùng trạng thái `liked` và `likes_count` mới             |

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
POST /api/posts/1/like/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

*(Không có body)*

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table   | Operation      | Note                                           |
| ------- | -------------- | ---------------------------------------------- |
| `posts` | SELECT         | Xác nhận bài tồn tại, `is_deleted=False`       |
| `likes` | SELECT/INSERT  | get_or_create Like record                      |
| `likes` | DELETE         | Xóa Like record khi unlike                     |
| `posts` | UPDATE         | Cập nhật `likes_count` bằng `F()` expression   |

### Query (Django ORM)

```python
from django.db.models import F

post = get_object_or_404(Post, pk=pk, is_deleted=False)
like, created = Like.objects.get_or_create(user=request.user, post=post)

if created:
    Post.objects.filter(pk=post.pk).update(likes_count=F("likes_count") + 1)
    liked = True
else:
    like.delete()
    Post.objects.filter(pk=post.pk).update(likes_count=F("likes_count") - 1)
    liked = False

post.refresh_from_db(fields=["likes_count"])
```

---

## 6. Response

### 200 OK — UC15 (Like)

```json
{
  "liked": true,
  "likes_count": 48
}
```

### 200 OK — UC16 (Unlike)

```json
{
  "liked": false,
  "likes_count": 47
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

| HTTP  | Nguyên nhân                         | Cách fix                                   |
| ----- | ----------------------------------- | ------------------------------------------ |
| `401` | Thiếu token                         | Thêm header `Authorization: Token <token>` |
| `404` | Bài không tồn tại hoặc đã bị xóa    | Kiểm tra `id` và trạng thái bài           |
| `500` | Lỗi database / race condition        | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                          | Mô tả                         |
| --------------------------------------------- | ----------------------------- |
| [UC17 — View Liked Posts](uc17-view-liked.md) | Danh sách bài đã like         |
| [UC18/19 — Bookmark](uc18-19-bookmark.md)     | Bookmark/Unbookmark (tương tự)|
| [UC3 — View Post Detail](../guest/uc03-view-post-detail.md) | Xem `is_liked` trong detail |
| [README](../README.md)                        | API Documentation Index       |
