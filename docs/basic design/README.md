# Blog Project API Documentation

API cho hệ thống Blog sử dụng Django REST Framework.

- **Version:** 1.0.0
- **Authentication:** Token Authentication (`django.contrib.authtoken` + `obtain_auth_token`)
- **Format:** JSON (`application/json`)
- **Pagination:** LimitOffsetPagination (`?limit=10&offset=0`)

## Roles

| Role  | Mô tả                                        |
| ----- | -------------------------------------------- |
| Guest | Chưa đăng nhập — chỉ xem                     |
| User  | Đã đăng nhập — tương tác đầy đủ              |
| Admin | Quản trị viên — toàn quyền (`is_staff=True`) |

## Authentication

Sau khi đăng nhập, mọi request cần xác thực phải gửi kèm header:

```
Authorization: Token <your_token_here>
```

Token không có thời hạn hết hạn theo mặc định của `obtain_auth_token`.
Để logout, gọi `POST /auth/logout/` để xóa token khỏi database.

## Standard Response Format

**Success — list (paginated):**

```json
{
  "count": 45,
  "next": "https://api.blogproject.com/api/v1/posts/?limit=10&offset=10",
  "previous": null,
  "results": []
}
```

**Success — detail:**

```json
{ "field": "value" }
```

**Error — validation (400):**

```json
{
  "field_name": ["Error message."],
  "non_field_errors": ["Error message."]
}
```

**Error — auth / permission / not found:**

```json
{
  "detail": "Error message."
}
```

---

## Guest Endpoints (UC1-UC8)

Các chức năng dành cho Guest — không yêu cầu xác thực.

| UC  | Endpoint                                               | Method | Mô Tả                                               |
| --- | ------------------------------------------------------ | ------ | --------------------------------------------------- |
| UC1 | [View Categories](guest/uc01-view-categories.md)       | GET    | `/api/categories/` - Lấy danh sách categories       |
| UC2 | [View Posts](guest/uc02-view-posts.md)                 | GET    | `/api/posts/` - Lấy danh sách bài viết              |
| UC3 | [View Post Detail](guest/uc03-view-post-detail.md)     | GET    | `/api/posts/{id}/` - Xem chi tiết bài viết          |
| UC4 | [View Related Posts](guest/uc04-view-related-posts.md) | GET    | `/api/posts/{id}/related/` - Xem bài viết liên quan |
| UC5 | [View Comments](guest/uc05-view-comments.md)           | GET    | `/api/posts/{post_id}/comments/` - Xem bình luận    |
| UC6 | [Search Posts](guest/uc06-search-posts.md)             | GET    | `/api/posts/search/` - Tìm kiếm bài viết            |
| UC7 | [Sign Up](guest/uc07-sign-up.md)                       | POST   | `/api/auth/register/` - Đăng ký tài khoản           |
| UC8 | [Log In](guest/uc08-log-in.md)                         | POST   | `/api/auth/login/` - Đăng nhập                      |

---

## User Endpoints (UC9-UC21, UC32)

Các chức năng dành cho User đã đăng nhập.

| UC      | Endpoint                                        | Method    | Mô Tả                                             |
| ------- | ----------------------------------------------- | --------- | ------------------------------------------------- |
| UC9     | [Create Post](user/uc09-create-post.md)         | POST      | `/api/posts/` - Tạo bài viết                      |
| UC10    | [Update Post](user/uc10-update-post.md)         | PUT/PATCH | `/api/posts/{id}/` - Sửa bài viết                 |
| UC11    | [Delete Post](user/uc11-delete-post.md)         | DELETE    | `/api/posts/{id}/` - Xóa bài viết                 |
| UC12    | [Create Comment](user/uc12-create-comment.md)   | POST      | `/api/posts/{post_id}/comments/` - Đăng bình luận |
| UC13    | [Update Comment](user/uc13-update-comment.md)   | PATCH     | `/api/comments/{id}/` - Sửa bình luận             |
| UC14    | [Delete Comment](user/uc14-delete-comment.md)   | DELETE    | `/api/comments/{id}/` - Xóa bình luận             |
| UC15/16 | [Like/Unlike Post](user/uc15-16-like-unlike.md) | POST      | `/api/posts/{id}/like/` - Like/Unlike             |
| UC17    | [View Liked Posts](user/uc17-view-liked.md)     | GET       | `/api/me/liked/` - Xem danh sách đã like          |
| UC18/19 | [Bookmark/Unbookmark](user/uc18-19-bookmark.md) | POST      | `/api/posts/{id}/bookmark/` - Bookmark/Unbookmark |
| UC20    | [View Bookmarks](user/uc20-view-bookmarks.md)   | GET       | `/api/me/bookmarks/` - Xem danh sách bookmark     |
| UC21    | [Upload Image](user/uc21-upload-image.md)       | POST      | `/api/upload/image/` - Upload ảnh                 |
| UC32    | [Log Out](user/uc32-log-out.md)                 | POST      | `/api/auth/logout/` - Đăng xuất                   |

---

## Admin Endpoints (UC22-UC31)

Các chức năng quản trị — yêu cầu `is_staff = True`.

| UC   | Endpoint                                               | Method | Mô Tả                                            |
| ---- | ------------------------------------------------------ | ------ | ------------------------------------------------ |
| UC22 | [Create Category](admin/uc22-create-category.md)       | POST   | `/api/categories/` - Tạo category                |
| UC23 | [Update Category](admin/uc23-update-category.md)       | PUT    | `/api/categories/{slug}/` - Cập nhật category    |
| UC24 | [Delete Category](admin/uc24-delete-category.md)       | DELETE | `/api/categories/{category_id}/` - Xóa category  |
| UC25 | [Delete Post (Admin)](admin/uc25-delete-post-admin.md) | DELETE | `/api/posts/{id}/` - Xóa bài của user khác       |
| UC26 | [Import Posts from CSV](admin/uc26-import-posts.md)    | POST   | `/api/admin/posts/import/` - Import posts từ CSV |
| UC27 | [Export Posts to CSV](admin/uc27-export-posts.md)      | GET    | `/api/admin/posts/export/` - Export posts ra CSV |
| UC28 | [Export Users to CSV](admin/uc28-export-users.md)      | GET    | `/api/admin/users/export/` - Export users ra CSV |
| UC29 | [Import Users from CSV](admin/uc29-import-users.md)    | POST   | `/api/admin/users/import/` - Import users từ CSV |
| UC30 | [Ban User](admin/uc30-ban-user.md)                     | POST   | `/api/admin/users/{id}/ban/` - Ban user          |
| UC31 | [Unban User](admin/uc31-unban-user.md)                 | POST   | `/api/admin/users/{id}/unban/` - Unban user      |

---

## Supporting Endpoints

Các endpoint hỗ trợ không thuộc use case cụ thể.

| Endpoint                                   | Method    | Mô Tả                                        |
| ------------------------------------------ | --------- | -------------------------------------------- |
| [Current User](supporting/current-user.md) | GET/PATCH | `/api/auth/me/` - Xem/sửa thông tin bản thân |

---

## HTTP Status Codes

| Status                      | Trường hợp                                      |
| --------------------------- | ----------------------------------------------- |
| `200 OK`                    | GET / PUT / PATCH / toggle thành công           |
| `201 Created`               | POST tạo resource thành công                    |
| `204 No Content`            | DELETE / logout thành công — không có body      |
| `400 Bad Request`           | Validation error, dữ liệu không hợp lệ          |
| `401 Unauthorized`          | Chưa gửi token hoặc token không hợp lệ / đã xóa |
| `403 Forbidden`             | Đã xác thực nhưng không đủ quyền                |
| `404 Not Found`             | Resource không tồn tại                          |
| `500 Internal Server Error` | Lỗi không mong đợi từ server                    |
