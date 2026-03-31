# UC22 — Create Category

**Endpoint:** `POST /api/categories/`  
**Role:** Admin (authentication required, `is_staff=True`)  
**Last Updated:** 2026-03-30  
**Status:** Ready for implementation

---

## 1. Overview

Tạo một category mới trong hệ thống.  
Chỉ Admin (`is_staff=True`) mới có quyền tạo category.  
`name` phải unique — không được trùng với category đã tồn tại.

---

## 2. Business Rules

| #   | Rule                                                                  |
| --- | --------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                   |
| BR2 | Chỉ Admin (`is_staff=True`) được tạo category → `403` nếu không phải |
| BR3 | `name` là bắt buộc, không được để trống                              |
| BR4 | `name` tối đa 100 ký tự                                               |
| BR5 | `name` phải unique — trùng tên → `400`                               |
| BR6 | Category mới tạo có `posts_count=0`                                   |
| BR7 | Trả về `201 Created` kèm object vừa tạo khi thành công               |

---

## 3. Request

### Headers

| Header          | Value              | Required |
| --------------- | ------------------ | -------- |
| `Authorization` | `Token <token>`    | Bắt buộc |
| `Content-Type`  | `application/json` | Bắt buộc |

### Path Parameters

Không có path parameter.

### Body Parameters

| Field  | Type   | Required | Constraints             |
| ------ | ------ | -------- | ----------------------- |
| `name` | string | Yes      | Unique, tối đa 100 ký tự |

### Request mẫu

```
POST /api/categories/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "name": "DevOps"
}
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu token.
2. **Permission Check** — `IsAdminUser` (is_staff=True) → `403` nếu không phải Admin.
3. **Validate Input** — Kiểm tra `name` không rỗng, không vượt quá 100 ký tự.
4. **Uniqueness Check** — Kiểm tra `name` chưa tồn tại trong DB → `400` nếu trùng.
5. **Create Category** — `Category.objects.create(name=name)`.
6. **Serialize & Return** — Serialize object → `201 Created`.

---

## 5. Database Operations

### Tables Affected

| Table      | Operation | Note                                    |
| ---------- | --------- | --------------------------------------- |
| `category` | SELECT    | Kiểm tra `name` đã tồn tại chưa         |
| `category` | INSERT    | Tạo category mới                        |

### Query (Django ORM)

```python
# Validation được xử lý bởi serializer (unique constraint trên model)
# Tạo category
serializer = CategorySerializer(data=request.data)
serializer.is_valid(raise_exception=True)
serializer.save()
```

---

## 6. Response

### 201 Created

```json
{
  "id": 3,
  "name": "DevOps",
  "posts_count": 0,
  "created_at": "2024-01-16T00:00:00Z"
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

---

## 7. Error Reference

| HTTP  | Nguyên nhân                  | Cách fix                                     |
| ----- | ---------------------------- | -------------------------------------------- |
| `400` | `name` bị trống hoặc thiếu   | Cung cấp `name` hợp lệ                       |
| `400` | `name` đã tồn tại            | Dùng tên category khác                       |
| `401` | Thiếu token                  | Thêm header `Authorization: Token <token>`   |
| `403` | Không phải Admin             | Dùng tài khoản có `is_staff=True`            |
| `500` | Lỗi database                 | Kiểm tra kết nối DB, xem server log          |

---

## 8. Related Files

| File                                              | Mô tả                              |
| ------------------------------------------------- | ---------------------------------- |
| [UC1 — View Categories](../guest/uc01-view-categories.md) | Xem danh sách category        |
| [UC23 — Update Category](uc23-update-category.md) | Cập nhật category                  |
| [UC24 — Delete Category](uc24-delete-category.md) | Xóa category                       |
| [README](../README.md)                            | API Documentation Index            |
