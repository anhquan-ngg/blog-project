# UC21 — Upload Image

**Endpoint:** `POST /api/files/upload/`  
**Role:** User (authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Upload ảnh lên S3 và tạo `File` record trong database.  
Trả về `file_id` và `url` để dùng khi tạo/sửa bài viết (UC9, UC10) thông qua bảng `post_images`.  
`status` của file khởi tạo là `active`.

---

## 2. Business Rules

| #   | Rule                                                                        |
| --- | --------------------------------------------------------------------------- |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới upload được                       |
| BR2 | Chỉ chấp nhận định dạng JPEG và PNG                                          |
| BR3 | Kích thước tối đa 5MB                                                        |
| BR4 | File được upload lên S3; `s3_key` lưu để dùng khi xóa file                  |
| BR5 | Record `File` được tạo với `status=active`, `uploaded_by=request.user`       |
| BR6 | `entity_type` và `entity_id` có thể để `null` lúc upload; sẽ gán sau khi tạo post |
| BR7 | Trả về `201 Created` kèm `file_id`, `url`, và `uploaded_at`                 |

---

## 3. Request

### Headers

| Header          | Value                 | Required |
| --------------- | --------------------- | -------- |
| `Authorization` | `Token <token>`       | Bắt buộc |
| `Content-Type`  | `multipart/form-data` | Bắt buộc |

### Request mẫu

```
POST /api/files/upload/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: multipart/form-data

image=<binary file>
```

### Body Parameters

| Field   | Type | Required | Mô tả                              |
| ------- | ---- | -------- | ---------------------------------- |
| `image` | file | **Yes**  | File ảnh JPEG hoặc PNG, tối đa 5MB |

---

## 4. Processing Flow


---

## 5. Database Operations

### Tables Affected

| Table   | Operation | Note                                                 |
| ------- | --------- | ---------------------------------------------------- |
| `files` | INSERT    | Tạo file record với `status=active`, `uploaded_by`  |

### Query (Django ORM)

```python
import uuid

s3_key = f"uploads/{request.user.id}/{uuid.uuid4()}.{ext}"
url    = upload_to_s3(file, s3_key)  # helper function

file_record = File.objects.create(
    uploaded_by  = request.user,
    url          = url,
    s3_key       = s3_key,
    status       = "active",
    entity_type  = None,
    entity_id    = None,
)
```

---

## 6. Response

### 201 Created

```json
{
  "id": 15,
  "url": "https://s3.amazonaws.com/bucket/uploads/1/abc123.jpg",
  "uploaded_at": "2024-01-16T08:30:00Z"
}
```

### 400 Bad Request — Định dạng không hợp lệ

```json
{
  "image": ["Only JPEG and PNG formats are accepted."]
}
```

### 400 Bad Request — File quá lớn

```json
{
  "image": ["Image must not exceed 5MB."]
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

| HTTP  | Nguyên nhân                          | Cách fix                                   |
| ----- | ------------------------------------ | ------------------------------------------ |
| `400` | Định dạng file không phải JPEG/PNG   | Chuyển đổi sang JPEG hoặc PNG              |
| `400` | File vượt quá 5MB                    | Nén file xuống dưới 5MB                    |
| `401` | Thiếu token                          | Thêm header `Authorization: Token <token>` |
| `500` | Lỗi kết nối S3 hoặc database         | Kiểm tra cấu hình S3, xem server log       |

---

## 8. Related Files

| File                                          | Mô tả                                      |
| --------------------------------------------- | ------------------------------------------ |
| [UC9 — Create Post](uc09-create-post.md)      | Dùng `file_id` để gắn ảnh vào bài          |
| [UC10 — Update Post](uc10-update-post.md)     | Dùng `file_id` để cập nhật ảnh bài         |
| [UC3 — View Post Detail](../guest/uc03-view-post-detail.md) | Xem ảnh đính kèm trong bài  |
| [README](../README.md)                        | API Documentation Index                    |
