# Current User — View & Update Profile

**Endpoint:** `GET /api/auth/me/` and `PATCH /api/auth/me/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Hai endpoint dùng chung URL `/api/auth/me/`:
- `GET`: Xem thông tin cá nhân của `request.user`.
- `PATCH`: Cập nhật một phần thông tin (chỉ `first_name`, `last_name`).

Không cho phép đổi `username`, `email`, `is_active`, `is_staff` qua API này.

---

## 2. Business Rules

| #   | Rule                                                                            |
| --- | ------------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới xem/sửa được thông tin của mình      |
| BR2 | `GET`: Trả về toàn bộ thông tin profile của `request.user`                      |
| BR3 | `PATCH`: Chỉ cho phép cập nhật `first_name` và `last_name`                     |
| BR4 | `first_name` và `last_name` tối đa 100 ký tự                                    |
| BR5 | `username`, `email`, `is_active`, `is_staff` là read-only — không thể sửa qua API này |

---

## 3. Request

### Headers

| Header          | Value              | Required                   |
| --------------- | ------------------ | -------------------------- |
| `Authorization` | `Token <token>`    | Bắt buộc                   |
| `Content-Type`  | `application/json` | Bắt buộc (chỉ với `PATCH`) |

### Request mẫu — GET

```
GET /api/auth/me/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Request mẫu — PATCH

```
PATCH /api/auth/me/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "first_name": "Johnny",
  "last_name": "Doe Jr"
}
```

### Body Parameters (PATCH only)

| Field        | Type   | Required | Mô tả             |
| ------------ | ------ | -------- | ----------------- |
| `first_name` | string | No       | Tối đa 100 ký tự  |
| `last_name`  | string | No       | Tối đa 100 ký tự  |

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu.
2. **GET** — Serialize `request.user` trực tiếp → `200 OK`.
3. **PATCH — Validate Input** — Chỉ nhận `first_name`, `last_name`; max 100 ký tự → `400` nếu vượt quá.
4. **PATCH — Update User** — `user.first_name`, `user.last_name`, `user.save()`.
5. **PATCH — Serialize & Return** — Serialize user sau update → `200 OK`.

---

## 5. Database Operations

### Tables Affected

| Table   | Operation | Note                                      |
| ------- | --------- | ----------------------------------------- |
| `users` | SELECT    | Lấy `request.user` (GET & PATCH)          |
| `users` | UPDATE    | Cập nhật `first_name`, `last_name` (PATCH)|

### Query (Django ORM)

```python
# GET
user = request.user  # Đã được resolved từ token

# PATCH
user.first_name = validated_data.get("first_name", user.first_name)
user.last_name  = validated_data.get("last_name", user.last_name)
user.save(update_fields=["first_name", "last_name"])
```

---

## 6. Response

### GET — 200 OK

```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_active": true,
  "date_joined": "2024-01-15T08:30:00Z"
}
```

### PATCH — 200 OK

```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "Johnny",
  "last_name": "Doe Jr",
  "is_active": true,
  "date_joined": "2024-01-15T08:30:00Z"
}
```

### 400 Bad Request — Validation lỗi

```json
{
  "first_name": ["Ensure this field has no more than 100 characters."]
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

| HTTP  | Nguyên nhân                      | Cách fix                                   |
| ----- | -------------------------------- | ------------------------------------------ |
| `400` | `first_name`/`last_name` quá dài | Giữ độ dài tối đa 100 ký tự               |
| `401` | Thiếu token                      | Thêm header `Authorization: Token <token>` |
| `500` | Lỗi database                     | Kiểm tra kết nối DB, xem server log        |

---

## 8. Related Files

| File                                     | Mô tả                         |
| ---------------------------------------- | ----------------------------- |
| [UC8 — Log In](../guest/uc08-log-in.md)  | Đăng nhập để lấy token        |
| [UC32 — Log Out](../user/uc32-log-out.md) | Đăng xuất                    |
| [README](../README.md)                   | API Documentation Index       |
