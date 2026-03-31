# UC35 — View Tag List

**Endpoint:** `GET /api/tags/`  
**Role:** User (authentication optional)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Trả về toàn bộ danh sách tag trong hệ thống.  
Không yêu cầu xác thực — bất kỳ ai cũng có thể xem danh sách tag.  
Không phân trang — số lượng tag thường nhỏ. Hỗ trợ tìm kiếm theo `name`.

---

## 2. Business Rules

| #   | Rule                                                           |
| --- | -------------------------------------------------------------- |
| BR1 | Không yêu cầu token — guest và user đều gọi được               |
| BR2 | Trả về toàn bộ tag, không lọc, không phân trang                |
| BR3 | Sắp xếp theo `name` tăng dần (A → Z)                           |
| BR4 | Hỗ trợ tìm kiếm gần đúng qua param `q` (`icontains` trên `name`) |
| BR5 | Tag không gắn với bài nào vẫn được trả về                      |

---

## 3. Request

### Headers

| Header          | Value           | Required       |
| --------------- | --------------- | -------------- |
| `Authorization` | `Token <token>` | Không bắt buộc |

### Request mẫu

```
GET /api/tags/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
```

### Query Parameters

| Param | Type   | Required | Default | Mô tả                                    |
| ----- | ------ | -------- | ------- | ---------------------------------------- |
| `q`   | string | No       | —       | Tìm kiếm tag theo `name` (`icontains`)   |

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table  | Operation | Note                                     |
| ------ | --------- | ---------------------------------------- |
| `tags` | SELECT    | Lấy toàn bộ tag, filter nếu có `q`      |

### Query (Django ORM)

```python
from django.db.models import Q

qs = Tag.objects.all().order_by("name")

q = request.query_params.get("q", "").strip()
if q:
    qs = qs.filter(name__icontains=q)
```

---

## 6. Response

### 200 OK

```json
[
  {
    "id": 1,
    "name": "Django",
    "slug": "django",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "REST API",
    "slug": "rest-api",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### 200 OK — Không có tag nào

```json
[]
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân  | Cách fix                            |
| ----- | ------------ | ----------------------------------- |
| `500` | Lỗi database | Kiểm tra kết nối DB, xem server log |

> Endpoint này không có lỗi 400, 401, 403, 404 vì không nhận input bắt buộc và không yêu cầu xác thực.

---

## 8. Related Files

| File                                                | Mô tả                                  |
| --------------------------------------------------- | -------------------------------------- |
| [UC34 — Create Tag](uc34-create-tag.md)             | Tạo tag mới                            |
| [UC36 — Add Tag to Post](uc36-add-tag-to-post.md)   | Gắn tag vào bài viết                   |
| [UC38 — Update Tag](uc38-update-tag.md)             | Cập nhật tag                           |
| [UC39 — Delete Tag](uc39-delete-tag.md)             | Xóa tag                                |
| [UC2 — View Posts](../guest/uc02-view-posts.md)     | Lọc bài viết theo tag                  |
| [README](../README.md)                              | API Documentation Index                |
