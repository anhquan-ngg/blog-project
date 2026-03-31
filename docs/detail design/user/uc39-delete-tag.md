# UC39 — Delete Tag

**Endpoint:** `DELETE /api/tags/{id}/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Xóa vĩnh viễn một tag khỏi hệ thống (hard delete).  
Khi tag bị xóa, tất cả các bản ghi `post_tags` liên quan sẽ bị xóa theo (cascade).  
Bất kỳ user đã đăng nhập nào cũng có thể xóa tag.

---

## 2. Business Rules

| #   | Rule                                                                            |
| --- | ------------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                              |
| BR2 | Tag phải tồn tại → `404` nếu không                                              |
| BR3 | Hard delete — xóa hoàn toàn khỏi DB (không có soft delete cho tag)              |
| BR4 | Cascade: tất cả bản ghi `post_tags` liên quan bị xóa theo (`ON DELETE CASCADE`) |
| BR5 | Tag đang được gắn vào nhiều bài vẫn xóa được — `post_tags` bị xóa cascade       |
| BR6 | Trả về `204 No Content` khi thành công                                          |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả  |
| ----- | ------- | -------- | ------ |
| `id`  | integer | Yes      | Tag ID |

### Request mẫu

```
DELETE /api/tags/5/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

_(Không có body)_

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table       | Operation | Note                                         |
| ----------- | --------- | -------------------------------------------- |
| `tags`      | SELECT    | Lấy tag theo `pk`                            |
| `post_tags` | DELETE    | Cascade xóa tất cả bản ghi liên quan đến tag |
| `tags`      | DELETE    | Xóa tag khỏi DB                              |

### Query (Django ORM)

```python
tag = get_object_or_404(Tag, pk=pk)
tag.delete()  # Django ORM tự xử lý ON DELETE CASCADE cho post_tags
```

---

## 6. Response

### 204 No Content

_(Không có body)_

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

| HTTP  | Nguyên nhân       | Cách fix                                   |
| ----- | ----------------- | ------------------------------------------ |
| `401` | Thiếu token       | Thêm header `Authorization: Token <token>` |
| `404` | Tag không tồn tại | Kiểm tra tag `id` qua UC35                 |
| `500` | Lỗi database      | Kiểm tra kết nối DB, xem server log        |

> ⚠️ **Lưu ý quan trọng:** Xóa tag sẽ tác động đến tất cả bài viết đang gắn tag đó — các bài viết sẽ mất tag này. Nên thông báo cho user trước khi xóa.

---

## 8. Related Files

| File                                                | Mô tả                       |
| --------------------------------------------------- | --------------------------- |
| [UC34 — Create Tag](uc34-create-tag.md)             | Tạo tag mới                 |
| [UC35 — View Tag List](uc35-view-tags.md)           | Xem danh sách tag           |
| [UC38 — Update Tag](uc38-update-tag.md)             | Cập nhật tên tag            |
| [UC36 — Add Tag to Post](uc36-add-tag-to-post.md)   | Gắn tag vào bài viết        |
| [UC37 — Update Post Tags](uc37-update-post-tags.md) | Replace toàn bộ tag của bài |
| [README](../README.md)                              | API Documentation Index     |
