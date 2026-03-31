# UC34 — Create Tag

**Endpoint:** `POST /api/tags/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Tạo tag mới trong hệ thống.  
`slug` được tự động generate từ `name` (lowercase, thay khoảng trắng bằng `-`).  
`name` và `slug` phải unique — không cho phép trùng lặp.

---

## 2. Business Rules

| #   | Rule                                                                           |
| --- | ------------------------------------------------------------------------------ |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới tạo được tag                         |
| BR2 | `name` là bắt buộc, unique, tối đa 50 ký tự                                   |
| BR3 | `slug` tự động generate từ `name` (slugify); không nhận từ client              |
| BR4 | `slug` phải unique — nếu đã tồn tại (do `name` tương tự) → `400`              |
| BR5 | Trả về `201 Created` kèm thông tin tag vừa tạo                                 |

---

## 3. Request

### Headers

| Header          | Value              | Required |
| --------------- | ------------------ | -------- |
| `Authorization` | `Token <token>`    | Bắt buộc |
| `Content-Type`  | `application/json` | Bắt buộc |

### Request mẫu

```
POST /api/tags/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "name": "REST API"
}
```

### Body Parameters

| Field  | Type   | Required | Mô tả                            |
| ------ | ------ | -------- | -------------------------------- |
| `name` | string | **Yes**  | Tên tag, unique, tối đa 50 ký tự |

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table  | Operation | Note                                    |
| ------ | --------- | --------------------------------------- |
| `tags` | SELECT    | Kiểm tra unique `name` và `slug`        |
| `tags` | INSERT    | Tạo tag mới                             |

### Query (Django ORM)

```python
from django.utils.text import slugify

name = validated_data["name"].strip()
slug = slugify(name)

# Kiểm tra unique (xử lý bởi serializer validate)
Tag.objects.filter(name__iexact=name).exists()
Tag.objects.filter(slug=slug).exists()

tag = Tag.objects.create(name=name, slug=slug)
```

---

## 6. Response

### 201 Created

```json
{
  "id": 5,
  "name": "REST API",
  "slug": "rest-api",
  "created_at": "2026-03-27T10:00:00Z"
}
```

### 400 Bad Request — Trùng `name`

```json
{
  "name": ["A tag with this name already exists."]
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

---

## 7. Error Reference

| HTTP  | Nguyên nhân                    | Cách fix                                   |
| ----- | ------------------------------ | ------------------------------------------ |
| `400` | `name` bị thiếu hoặc trống     | Bổ sung `name` hợp lệ                      |
| `400` | `name` đã tồn tại              | Dùng tên tag khác                          |
| `400` | `name` vượt quá 50 ký tự       | Rút ngắn tên tag                           |
| `401` | Thiếu token                    | Thêm header `Authorization: Token <token>` |
| `500` | Lỗi database                   | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                                | Mô tả                              |
| --------------------------------------------------- | ---------------------------------- |
| [UC35 — View Tag List](uc35-view-tags.md)           | Xem danh sách tag                  |
| [UC36 — Add Tag to Post](uc36-add-tag-to-post.md)   | Gắn tag vào bài viết               |
| [UC38 — Update Tag](uc38-update-tag.md)             | Cập nhật tag                       |
| [UC39 — Delete Tag](uc39-delete-tag.md)             | Xóa tag                            |
| [README](../README.md)                              | API Documentation Index            |
