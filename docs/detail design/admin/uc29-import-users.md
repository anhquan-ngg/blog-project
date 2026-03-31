# UC29 — Import Users from CSV

**Endpoint:** `POST /api/admin/users/import/`  
**Role:** Admin (authentication required, `is_staff=True`)  
**Last Updated:** 2026-03-30  
**Status:** Ready for implementation

---

## 1. Overview

Import hàng loạt user từ file CSV bằng `User.objects.create_user()`.  
Chỉ Admin (`is_staff=True`) mới có quyền thực hiện.  
Mỗi dòng lỗi sẽ bị bỏ qua (skip) — không rollback toàn bộ.  
Kết quả trả về thống kê: tổng dòng, số dòng thành công, số dòng bị bỏ qua, và danh sách lỗi.  
Password được hash tự động qua `create_user()` — không lưu plaintext.

---

## 2. Business Rules

| #   | Rule                                                                                       |
| --- | ------------------------------------------------------------------------------------------ |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                                        |
| BR2 | Chỉ Admin (`is_staff=True`) được import → `403` nếu không phải                             |
| BR3 | File phải là CSV (kiểm tra MIME type và extension) → `400` nếu sai định dạng               |
| BR4 | Kích thước file tối đa 10MB → `400` nếu vượt quá                                           |
| BR5 | CSV header bắt buộc: `username, email, password, first_name, last_name`                    |
| BR6 | `username` phải unique — trùng tên → skip dòng đó, ghi vào `errors`                        |
| BR7 | `email` phải đúng format email hợp lệ → skip nếu sai                                      |
| BR8 | `password` được hash qua `create_user()` — không lưu plaintext vào DB                     |
| BR9 | Không rollback khi có lỗi — commit từng dòng thành công độc lập                            |
| BR10| `is_staff` và `is_active` của user mới mặc định là `False` và `True` (thứ tự tương ứng)   |
| BR11| Trả về `200 OK` kèm thống kê ngay cả khi toàn bộ dòng bị skip                             |

---

## 3. Request

### Headers

| Header          | Value                 | Required |
| --------------- | --------------------- | -------- |
| `Authorization` | `Token <token>`       | Bắt buộc |
| `Content-Type`  | `multipart/form-data` | Bắt buộc |

### Body Parameters (form-data)

| Field  | Type | Required | Constraints         |
| ------ | ---- | -------- | ------------------- |
| `file` | file | Yes      | `.csv`, tối đa 10MB |

### CSV Format

| Column       | Type   | Required | Mô tả                                          |
| ------------ | ------ | -------- | ---------------------------------------------- |
| `username`   | string | Yes      | Tên đăng nhập, tối đa 150 ký tự, phải unique   |
| `email`      | string | Yes      | Địa chỉ email hợp lệ                           |
| `password`   | string | Yes      | Mật khẩu plaintext (sẽ được hash khi lưu)      |
| `first_name` | string | No       | Tên (có thể để trống)                          |
| `last_name`  | string | No       | Họ (có thể để trống)                           |

### Request mẫu

```
POST /api/admin/users/import/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token <admin_token>
Content-Type: multipart/form-data

file=<users.csv>
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu token.
2. **Permission Check** — `IsAdminUser` (is_staff=True) → `403` nếu không phải Admin.
3. **File Validation** — Kiểm tra file tồn tại, đúng định dạng CSV, ≤ 10MB → `400` nếu sai.
4. **Parse CSV** — Đọc file, kiểm tra header bắt buộc (`username`, `email`, `password`) tồn tại.
5. **Row-by-Row Processing** — Với mỗi dòng:
   - Validate `username` không rỗng, không trùng `User` hiện có.
   - Validate `email` đúng format.
   - Validate `password` không rỗng.
   - Tạo User qua `User.objects.create_user()`.
   - Ghi nhận lỗi vào `errors` nếu có.
6. **Return Stats** — Trả về `200 OK` kèm thống kê `total_rows`, `imported`, `skipped`, `errors`.

---

## 5. Database Operations

### Tables Affected

| Table       | Operation | Note                                                     |
| ----------- | --------- | -------------------------------------------------------- |
| `auth_user` | SELECT    | Kiểm tra `username` đã tồn tại chưa (cho mỗi dòng CSV) |
| `auth_user` | INSERT    | Tạo user mới qua `create_user()` (password được hash)   |

### Query (Django ORM)

```python
import csv
import io
from django.contrib.auth.models import User

def import_users(file):
    decoded = file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    total_rows = 0
    imported = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):  # start=2 (row 1 là header)
        total_rows += 1
        try:
            User.objects.create_user(
                username=row["username"],
                email=row["email"],
                password=row["password"],
                first_name=row.get("first_name", ""),
                last_name=row.get("last_name", ""),
            )
            imported += 1
        except Exception as e:
            errors.append({"row": row_num, "reason": str(e)})

    return {
        "total_rows": total_rows,
        "imported": imported,
        "skipped": total_rows - imported,
        "errors": errors,
    }
```

---

## 6. Response

### 200 OK — Thành công (có thể kèm lỗi một số dòng)

```json
{
  "total_rows": 30,
  "imported": 28,
  "skipped": 2,
  "errors": [
    {
      "row": 7,
      "reason": "username: A user with that username already exists."
    },
    {
      "row": 19,
      "reason": "email: Enter a valid email address."
    }
  ]
}
```

### 200 OK — Toàn bộ dòng thành công

```json
{
  "total_rows": 20,
  "imported": 20,
  "skipped": 0,
  "errors": []
}
```

### 400 Bad Request — Sai định dạng file

```json
{
  "file": ["Only CSV files are accepted."]
}
```

### 400 Bad Request — File quá lớn

```json
{
  "file": ["File size must not exceed 10MB."]
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

| HTTP  | Nguyên nhân                        | Cách fix                                      |
| ----- | ---------------------------------- | --------------------------------------------- |
| `400` | File không phải CSV                | Upload đúng định dạng `.csv`                  |
| `400` | File vượt quá 10MB                 | Chia nhỏ file CSV và upload nhiều lần         |
| `401` | Thiếu token                        | Thêm header `Authorization: Token <token>`    |
| `403` | Không phải Admin                   | Dùng tài khoản có `is_staff=True`             |
| `500` | Lỗi đọc file hoặc database         | Kiểm tra encoding UTF-8 và kết nối DB         |

> Lỗi từng dòng CSV (username trùng, email sai format...) được ghi vào `errors[]` trong response body, không gây HTTP error.

---

## 8. Related Files

| File                                                | Mô tả                              |
| --------------------------------------------------- | ---------------------------------- |
| [UC28 — Export Users to CSV](uc28-export-users.md)  | Xuất danh sách user ra CSV         |
| [UC26 — Import Posts from CSV](uc26-import-posts.md)| Import bài viết từ CSV             |
| [UC30 — Ban User](uc30-ban-user.md)                 | Khóa tài khoản user                |
| [README](../README.md)                              | API Documentation Index            |
