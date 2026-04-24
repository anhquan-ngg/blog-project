# UC26 — Import Posts from CSV

**Endpoint:** `POST /api/admin/posts/import/`  
**Role:** Admin (authentication required, `is_staff=True`)  
**Last Updated:** 2026-04-16  
**Status:** Ready for implementation

---

## 1. Overview

Import hàng loạt bài viết từ file CSV.  
Chỉ Admin (`is_staff=True`) mới có quyền thực hiện.  
Mỗi dòng lỗi sẽ bị bỏ qua (skip) — không rollback toàn bộ.  
Kết quả trả về thống kê: tổng dòng, số dòng thành công, số dòng bị bỏ qua, và danh sách lỗi.

---

## 2. Business Rules

| #   | Rule                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------ |
| BR1 | Yêu cầu token — chỉ user đã đăng nhập mới gọi được                                                                             |
| BR2 | Chỉ Admin (`is_staff=True`) được import → `403` nếu không phải                                                                 |
| BR3 | File phải là CSV (kiểm tra MIME type và extension) → `400` nếu sai định dạng                                                   |
| BR4 | Kích thước file tối đa 10MB → `400` nếu vượt quá                                                                               |
| BR5 | CSV header bắt buộc: `title, content, category_name`. Author của bài import luôn là user đang thực hiện import (request.user). |
| BR6 | Mỗi dòng lỗi (category không tồn tại, field trống/invalid ...) bị skip                                                         |
| BR7 | Không rollback khi có lỗi — dùng cơ chế row-by-row, commit từng dòng thành công                                                |
| BR8 | Trả về `200 OK` kèm thống kê ngay cả khi toàn bộ dòng bị skip                                                                  |
| BR9 | `is_deleted` mặc định `False` nếu CSV không cung cấp                                                                           |

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

| Column          | Type   | Required | Mô tả                              |
| --------------- | ------ | -------- | ---------------------------------- |
| `title`         | string | Yes      | Tiêu đề bài viết, tối đa 255 ký tự |
| `content`       | string | Yes      | Nội dung bài viết                  |
| `category_name` | string | Yes      | Tên category phải tồn tại trong DB |

### Request mẫu

```
POST /api/admin/posts/import/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
Authorization: Token <admin_token>
Content-Type: multipart/form-data

file=<posts.csv>
```

---

## 4. Processing Flow

1. **Auth Check** — Token authentication → `401` nếu thiếu token.
2. **Permission Check** — `IsAdminUser` (is_staff=True) → `403` nếu không phải Admin.
3. **File Validation** — Kiểm tra file tồn tại, đúng định dạng CSV, ≤ 10MB → `400` nếu sai.
4. **Parse CSV** — Đọc file, kiểm tra header bắt buộc tồn tại.
5. **Row-by-Row Processing** — Với mỗi dòng:
   - Validate `title`, `content` không rỗng.
   - Lookup `category` theo `category_name` → skip nếu không tìm thấy.

- Gán `author = request.user` (user đang import).
- Tạo `Post` object và lưu DB.
- Ghi nhận lỗi vào danh sách `errors` nếu có.

6. **Return Stats** — Trả về `200 OK` kèm thống kê `total_rows`, `imported`, `skipped`, `errors`.

---

## 5. Database Operations

### Tables Affected

| Table       | Operation | Note                                          |
| ----------- | --------- | --------------------------------------------- |
| `category`  | SELECT    | Lookup `category_name` cho mỗi dòng CSV       |
| `auth_user` | SELECT    | Lấy `request.user` từ phiên xác thực hiện tại |
| `posts`     | INSERT    | Tạo bài viết mới cho mỗi dòng hợp lệ          |

### Query (Django ORM)

```python
import csv
import io

def import_posts(file, request_user):
    decoded = file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    total_rows = 0
    imported = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):  # start=2 (row 1 là header)
        total_rows += 1
        try:
            category = Category.objects.get(name=row["category_name"])
            Post.objects.create(
                title=row["title"],
                content=row["content"],
                category=category,
                author=request_user,
            )
            imported += 1
        except (Category.DoesNotExist, KeyError, Exception) as e:
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
  "total_rows": 50,
  "imported": 47,
  "skipped": 3,
  "errors": [
    { "row": 5, "reason": "Category 'Unknown' does not exist." },
    { "row": 12, "reason": "title: This field may not be blank." },
    { "row": 38, "reason": "content: This field may not be blank." }
  ]
}
```

### 200 OK — Toàn bộ dòng thành công

```json
{
  "total_rows": 10,
  "imported": 10,
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

| HTTP  | Nguyên nhân                | Cách fix                                   |
| ----- | -------------------------- | ------------------------------------------ |
| `400` | File không phải CSV        | Upload đúng định dạng `.csv`               |
| `400` | File vượt quá 10MB         | Chia nhỏ file CSV và upload nhiều lần      |
| `401` | Thiếu token                | Thêm header `Authorization: Token <token>` |
| `403` | Không phải Admin           | Dùng tài khoản có `is_staff=True`          |
| `500` | Lỗi đọc file hoặc database | Kiểm tra encoding UTF-8 và kết nối DB      |

> Lỗi từng dòng CSV (category không tồn tại, field thiếu/blank...) được ghi vào `errors[]` trong response body, không gây HTTP error.

---

## 8. Related Files

| File                                                 | Mô tả                   |
| ---------------------------------------------------- | ----------------------- |
| [UC27 — Export Posts to CSV](uc27-export-posts.md)   | Xuất bài viết ra CSV    |
| [UC29 — Import Users from CSV](uc29-import-users.md) | Import user từ CSV      |
| [UC9 — Create Post](../user/uc09-create-post.md)     | Tạo bài viết (một bài)  |
| [README](../README.md)                               | API Documentation Index |
