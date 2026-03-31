# UC32 — Log Out

**Endpoint:** `POST /api/auth/logout/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Đăng xuất bằng cách xóa Token DRF của user hiện tại khỏi database.  
Sau khi đăng xuất, token cũ sẽ không còn hợp lệ — mọi request dùng token cũ sẽ nhận `401`.

---

## 2. Business Rules

| #   | Rule                                                              |
| --- | ----------------------------------------------------------------- |
| BR1 | Yêu cầu token hợp lệ — không có token → `401`                    |
| BR2 | Xóa `Token` record của `request.user` khỏi bảng `authtoken_token` |
| BR3 | Trả về `204 No Content` khi thành công                            |
| BR4 | Token đã xóa không thể dùng lại — phải đăng nhập lại để lấy token mới |

---

## 3. Request

### Headers

| Header          | Value           | Required |
| --------------- | --------------- | -------- |
| `Authorization` | `Token <token>` | Bắt buộc |

### Request mẫu

```
POST /api/auth/logout/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

*(Không có body)*

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table             | Operation | Note                         |
| ----------------- | --------- | ---------------------------- |
| `authtoken_token` | DELETE    | Xóa token của `request.user` |

### Query (Django ORM)

```python
from rest_framework.authtoken.models import Token

Token.objects.filter(user=request.user).delete()
```

---

## 6. Response

### 204 No Content

*(Không có body)*

### 401 Unauthorized — Không có token hoặc token sai

```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                    | Cách fix                                   |
| ----- | ------------------------------ | ------------------------------------------ |
| `401` | Thiếu token hoặc token không hợp lệ | Thêm header `Authorization: Token <token>` hợp lệ |
| `500` | Lỗi database                   | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                     | Mô tả                         |
| ---------------------------------------- | ----------------------------- |
| [UC8 — Log In](../guest/uc08-log-in.md)  | Đăng nhập để lấy token        |
| [README](../README.md)                   | API Documentation Index       |
