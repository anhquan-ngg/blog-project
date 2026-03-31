# UC24 — Delete Category

**Endpoint:** `DELETE /api/categories/{id}/`  
**Role:** Admin (authentication required, `is_staff=True`)  
**Last Updated:** 2026-03-30  
**Status:** Ready for implementation

---

## 1. Overview

Xóa mềm (soft delete) một category bằng cách set `is_deleted=True` và ghi lại `deleted_at`.  
Chỉ Admin (`is_staff=True`) mới có quyền thực hiện.  
Category sau khi xóa sẽ không xuất hiện trong bất kỳ API GET nào.  
**Không cho phép xóa category đang có bài viết** (`is_deleted=False`) — phải chuyển hoặc xóa hết bài trước.

---

## 2. Business Rules

| #   | Rule                                                                                         |
| --- | -------------------------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                                          |
| BR2 | Chỉ Admin (`is_staff=True`) được xóa category → `403` nếu không phải                        |
| BR3 | Category không tồn tại hoặc đã `is_deleted=True` → `404`                                    |
| BR4 | Không cho phép xóa category đang có bài viết (`is_deleted=False`) → `400` kèm thông báo     |
| BR5 | Xóa mềm: set `is_deleted=True`, `deleted_at=now()` — không xóa khỏi DB                     |
| BR6 | Category con (`parent_id` trỏ về category này) cũng bị soft delete theo (cascade soft)      |
| BR7 | Trả về `204 No Content` khi thành công                                                       |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả       |
| ----- | ------- | -------- | ----------- |
| `id`  | integer | Yes      | Category ID |

### Request mẫu

```
DELETE /api/categories/3/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu token.
2. **Permission Check** — `IsAdminUser` (is_staff=True) → `403` nếu không phải Admin.
3. **Fetch Category** — `get_object_or_404(Category, pk=id, is_deleted=False)` → `404` nếu không tìm thấy hoặc đã bị xóa.
4. **Posts Check** — Đếm số bài `is_deleted=False` thuộc category → `400` nếu `count > 0`.
5. **Soft Delete Category** — Set `is_deleted=True`, `deleted_at=now()` trên category.
6. **Cascade Soft Delete Children** — Tìm và soft delete toàn bộ category con (`parent_id=id`, `is_deleted=False`).
7. **Return Response** — `204 No Content`.

---

## 5. Database Operations

### Tables Affected

| Table      | Operation | Note                                                         |
| ---------- | --------- | ------------------------------------------------------------ |
| `category` | SELECT    | Lấy category theo `pk`, kiểm tra `is_deleted=False`          |
| `post`     | COUNT     | Đếm bài `is_deleted=False` thuộc category                    |
| `category` | UPDATE    | Set `is_deleted=True`, `deleted_at=now()` cho category       |
| `category` | UPDATE    | Cascade soft delete toàn bộ category con (`parent_id=pk`)    |

### Query (Django ORM)

```python
from django.utils import timezone

category = get_object_or_404(Category, pk=pk, is_deleted=False)

# Kiểm tra số bài viết còn tồn tại
posts_count = category.posts.filter(is_deleted=False).count()

if posts_count > 0:
    raise ValidationError(
        f"Cannot delete category '{category.name}' because it has {posts_count} post(s)."
    )

now = timezone.now()

# Soft delete category hiện tại
category.is_deleted = True
category.deleted_at = now
category.save(update_fields=["is_deleted", "deleted_at"])

# Cascade soft delete toàn bộ category con
Category.objects.filter(parent_id=pk, is_deleted=False).update(
    is_deleted=True,
    deleted_at=now,
)
```

---

## 6. Response

### 204 No Content

*(Không có body)*

### 400 Bad Request — Category đang có bài viết (`is_deleted=False`)

```json
{
  "non_field_errors": [
    "Cannot delete category 'Backend Development' because it has 28 post(s)."
  ]
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

### 404 Not Found

```json
{
  "detail": "Not found."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                                    | Cách fix                                              |
| ----- | ---------------------------------------------- | ----------------------------------------------------- |
| `400` | Category đang có bài viết (`is_deleted=False`) | Chuyển hoặc xóa hết bài viết trước khi xóa category   |
| `401` | Thiếu token                                    | Thêm header `Authorization: Token <token>`            |
| `403` | Không phải Admin                               | Dùng tài khoản có `is_staff=True`                     |
| `404` | Category không tồn tại hoặc đã bị xóa          | Kiểm tra `id` hợp lệ và trạng thái category           |
| `500` | Lỗi database                                   | Kiểm tra kết nối DB, xem server log                   |

---

## 8. Related Files

| File                                              | Mô tả                              |
| ------------------------------------------------- | ---------------------------------- |
| [UC1 — View Categories](../guest/uc01-view-categories.md) | Xem danh sách category        |
| [UC22 — Create Category](uc22-create-category.md) | Tạo category mới                   |
| [UC23 — Update Category](uc23-update-category.md) | Cập nhật category                  |
| [README](../README.md)                            | API Documentation Index            |
