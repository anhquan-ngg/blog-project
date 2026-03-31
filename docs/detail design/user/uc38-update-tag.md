# UC38 — Update Tag

**Endpoint:** `PATCH /api/tags/{id}/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Cập nhật tên (`name`) của một tag.  
`slug` tự động được regenerate từ `name` mới khi cập nhật.  
Bất kỳ user đã đăng nhập nào cũng có thể cập nhật tag (không giới hạn chủ sở hữu).

---

## 2. Business Rules

| #   | Rule                                                                       |
| --- | -------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                         |
| BR2 | Tag phải tồn tại → `404` nếu không                                         |
| BR3 | Chỉ cho phép cập nhật `name`; `slug` tự động regenerate từ `name` mới     |
| BR4 | `name` mới phải unique — trùng với tag khác → `400`                        |
| BR5 | `slug` mới (từ `name` mới) phải unique — trùng → `400`                     |
| BR6 | `created_at` không thay đổi khi update                                     |
| BR7 | Tag đang được gắn vào các bài viết vẫn được phép cập nhật (tên sẽ đồng bộ)|

---

## 3. Request

### Headers

| Header          | Value              | Required |
| --------------- | ------------------ | -------- |
| `Authorization` | `Token <token>`    | Bắt buộc |
| `Content-Type`  | `application/json` | Bắt buộc |

### Path Parameters

| Param | Type    | Required | Mô tả  |
| ----- | ------- | -------- | ------ |
| `id`  | integer | Yes      | Tag ID |

### Request mẫu

```
PATCH /api/tags/5/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "name": "REST Framework"
}
```

### Body Parameters

| Field  | Type   | Required | Mô tả                             |
| ------ | ------ | -------- | --------------------------------- |
| `name` | string | **Yes**  | Tên mới của tag, tối đa 50 ký tự  |

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table  | Operation | Note                                             |
| ------ | --------- | ------------------------------------------------ |
| `tags` | SELECT    | Lấy tag theo `pk`                                |
| `tags` | SELECT    | Kiểm tra unique `name` và `slug` (trừ bản thân) |
| `tags` | UPDATE    | Cập nhật `name` và `slug`                        |

### Query (Django ORM)

```python
from django.utils.text import slugify

tag      = get_object_or_404(Tag, pk=pk)
new_name = validated_data["name"].strip()
new_slug = slugify(new_name)

# Kiểm tra unique (loại trừ chính nó)
if Tag.objects.filter(name__iexact=new_name).exclude(pk=tag.pk).exists():
    raise ValidationError({"name": "A tag with this name already exists."})
if Tag.objects.filter(slug=new_slug).exclude(pk=tag.pk).exists():
    raise ValidationError({"name": "A tag with a similar name already exists."})

tag.name = new_name
tag.slug = new_slug
tag.save(update_fields=["name", "slug"])
```

---

## 6. Response

### 200 OK

```json
{
  "id": 5,
  "name": "REST Framework",
  "slug": "rest-framework",
  "created_at": "2026-03-27T10:00:00Z"
}
```

### 400 Bad Request — `name` trùng với tag khác

```json
{
  "name": ["A tag with this name already exists."]
}
```

### 400 Bad Request — `name` trống hoặc thiếu

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

### 404 Not Found

```json
{
  "detail": "Not found."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                   | Cách fix                                   |
| ----- | ----------------------------- | ------------------------------------------ |
| `400` | `name` thiếu hoặc trống       | Truyền `name` hợp lệ                       |
| `400` | `name` trùng với tag khác     | Dùng tên tag khác                          |
| `400` | `name` vượt quá 50 ký tự      | Rút ngắn tên tag                           |
| `401` | Thiếu token                   | Thêm header `Authorization: Token <token>` |
| `404` | Tag không tồn tại             | Kiểm tra tag `id`                          |
| `500` | Lỗi database                  | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                                | Mô tả                              |
| --------------------------------------------------- | ---------------------------------- |
| [UC34 — Create Tag](uc34-create-tag.md)             | Tạo tag mới                        |
| [UC35 — View Tag List](uc35-view-tags.md)           | Xem danh sách tag                  |
| [UC39 — Delete Tag](uc39-delete-tag.md)             | Xóa tag                            |
| [README](../README.md)                              | API Documentation Index            |
