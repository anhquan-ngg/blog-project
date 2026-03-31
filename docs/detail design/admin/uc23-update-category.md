# UC23 — Update Category

**Endpoint:** `PUT /api/categories/{id}/`  
**Role:** Admin (authentication required, `is_staff=True`)  
**Last Updated:** 2026-03-30  
**Status:** Ready for implementation

---

## 1. Overview

Cập nhật tên của một category đã tồn tại.  
Chỉ Admin (`is_staff=True`) mới có quyền cập nhật.  
`name` mới phải unique — không được trùng với category khác đang tồn tại.

---

## 2. Business Rules

| #   | Rule                                                                        |
| --- | --------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                         |
| BR2 | Chỉ Admin (`is_staff=True`) được cập nhật category → `403` nếu không phải  |
| BR3 | Category không tồn tại → `404`                                              |
| BR4 | `name` là bắt buộc, không được để trống                                    |
| BR5 | `name` tối đa 100 ký tự                                                     |
| BR6 | `name` mới phải unique (loại trừ chính category đang update) → `400` nếu trùng |
| BR7 | `posts_count` trong response phản ánh số bài hiện tại của category          |
| BR8 | Trả về `200 OK` kèm object đã cập nhật khi thành công                      |

---

## 3. Request

### Headers

| Header          | Value              | Required |
| --------------- | ------------------ | -------- |
| `Authorization` | `Token <token>`    | Bắt buộc |
| `Content-Type`  | `application/json` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả       |
| ----- | ------- | -------- | ----------- |
| `id`  | integer | Yes      | Category ID |

### Body Parameters

| Field  | Type   | Required | Constraints             |
| ------ | ------ | -------- | ----------------------- |
| `name` | string | Yes      | Unique, tối đa 100 ký tự |

### Request mẫu

```
PUT /api/categories/1/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "name": "Backend & API Development"
}
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu token.
2. **Permission Check** — `IsAdminUser` (is_staff=True) → `403` nếu không phải Admin.
3. **Fetch Category** — `get_object_or_404(Category, pk=id)` → `404` nếu không tìm thấy.
4. **Validate Input** — Kiểm tra `name` không rỗng, không vượt quá 100 ký tự.
5. **Uniqueness Check** — Kiểm tra `name` chưa tồn tại ở category khác → `400` nếu trùng.
6. **Update Category** — `category.name = name`, `category.save()`.
7. **Serialize & Return** — Serialize object (bao gồm `posts_count`) → `200 OK`.

---

## 5. Database Operations

### Tables Affected

| Table      | Operation | Note                                                      |
| ---------- | --------- | --------------------------------------------------------- |
| `category` | SELECT    | Lấy category theo `pk`                                    |
| `category` | SELECT    | Kiểm tra `name` đã tồn tại ở category khác chưa           |
| `post`     | COUNT     | Đếm bài `is_deleted=False` để trả về `posts_count`        |
| `category` | UPDATE    | Cập nhật `name`                                           |

### Query (Django ORM)

```python
from django.db.models import Count, Q

# Lấy category
category = get_object_or_404(Category, pk=pk)

# Validation & cập nhật qua serializer
serializer = CategorySerializer(category, data=request.data)
serializer.is_valid(raise_exception=True)
serializer.save()

# Annotate posts_count cho response
Category.objects.annotate(
    posts_count=Count("posts", filter=Q(posts__is_deleted=False))
).get(pk=pk)
```

---

## 6. Response

### 200 OK

```json
{
  "id": 1,
  "name": "Backend & API Development",
  "posts_count": 28,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 400 Bad Request — Trùng tên

```json
{
  "name": ["category with this name already exists."]
}
```

### 400 Bad Request — Thiếu `name`

```json
{
  "name": ["This field is required."]
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

| HTTP  | Nguyên nhân                            | Cách fix                                    |
| ----- | -------------------------------------- | ------------------------------------------- |
| `400` | `name` bị trống hoặc thiếu             | Cung cấp `name` hợp lệ                      |
| `400` | `name` trùng với category khác         | Dùng tên category khác                      |
| `401` | Thiếu token                            | Thêm header `Authorization: Token <token>`  |
| `403` | Không phải Admin                       | Dùng tài khoản có `is_staff=True`           |
| `404` | Category không tồn tại                 | Kiểm tra `id` hợp lệ                        |
| `500` | Lỗi database                           | Kiểm tra kết nối DB, xem server log         |

---

## 8. Related Files

| File                                              | Mô tả                              |
| ------------------------------------------------- | ---------------------------------- |
| [UC1 — View Categories](../guest/uc01-view-categories.md) | Xem danh sách category        |
| [UC22 — Create Category](uc22-create-category.md) | Tạo category mới                   |
| [UC24 — Delete Category](uc24-delete-category.md) | Xóa category                       |
| [README](../README.md)                            | API Documentation Index            |
