# UC3 — View Post Detail

**Endpoint:** `GET /api/posts/{id}/`  
**Role:** Guest (no authentication required)  
**Last Updated:** 2026-03-27  
**Status:** Ready for implementation

---

## 1. Overview

Trả về toàn bộ thông tin chi tiết của một bài viết theo ID.  
Không yêu cầu xác thực — bất kỳ ai cũng có thể xem.  
`is_liked` / `is_bookmarked` trả về `false` với guest; với user đã đăng nhập thì kiểm tra thực tế.

---

## 2. Business Rules

| #   | Rule                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR1 | Không yêu cầu token — guest và user đều gọi được                                                                                                                                               |
| BR2 | Chỉ trả về bài có `is_deleted=False`; bài đã xóa trả về `404`                                                                                                                                  |
| BR3 | `content` lưu dạng **JSONField** — mảng các block `{ type, data }` (paragraph, heading, image, …)                                                                                              |
| BR4 | Block `type="image"` lưu `file_id` tham chiếu tới `files.id`; server resolve thành `url` trước khi trả response                                                                                |
| BR5 | `post_images` là bảng **mirror** — được sync từ các image block trong `content` khi save/update post; đảm bảo FK constraint và cho phép query nhanh không parse JSON                           |
| BR6 | Ở UC03, dữ liệu từ `post_images` được dùng để prefetch URL và nhúng vào `content`. Do đó, mảng `post_images` sẽ bị **loại bỏ (ẩn)** khỏi payload trả về để tránh dư thừa và trùng lặp dữ liệu. |
| BR7 | `is_liked` / `is_bookmarked` = `false` với guest; kiểm tra thực tế khi user đăng nhập                                                                                                          |

---

## 3. Request

### Headers

| Header          | Value           | Required       |
| --------------- | --------------- | -------------- |
| `Authorization` | `Token <token>` | Không bắt buộc |

### Request mẫu

```
GET /api/posts/1/ HTTP/1.1
Host: <Example: api.blogproject.quanna.io.vn>
```

### Path Parameters

| Param | Type    | Required | Mô tả   |
| ----- | ------- | -------- | ------- |
| `id`  | integer | Yes      | Post ID |

---

## 4. Processing Flow

1. **No Auth Check** — AllowAny permission, bỏ qua xác thực.
2. **Fetch Post** — `get_object_or_404(Post, pk=id, is_deleted=False)` → `404` nếu không tìm thấy.
3. **Prefetch post_images** — Join `post_images → files` để resolve `file_id` → `url` cho các image block.
4. **Annotate flags** — `is_liked` / `is_bookmarked` chỉ khi user đã đăng nhập (dùng `Exists` subquery).
5. **Resolve image blocks** — Trong serializer, map `file_id` trong mỗi image block → `url` từ `post_images` đã prefetch.
6. **Serialize & Return** — Serialize object → `200 OK`.

---

## 5. Database Operations

### Tables Affected

| Table         | Operation | Note                                                                                             |
| ------------- | --------- | ------------------------------------------------------------------------------------------------ |
| `posts`       | SELECT    | Lấy bài viết theo `pk`, lọc `is_deleted=False`; `content` là JSONField                           |
| `users`       | JOIN      | Thông tin tác giả                                                                                |
| `categories`  | JOIN      | Tên category                                                                                     |
| `tags`        | Prefetch  | Danh sách tag                                                                                    |
| `post_images` | Prefetch  | Mirror các image block trong `content`; JOIN `files` để lấy `url`, sắp xếp theo `order` tăng dần |
| `files`       | JOIN      | Resolve `file_id` → `url` (S3); lọc `status='active'`                                            |
| `likes`       | subquery  | Kiểm tra `is_liked` (user đăng nhập)                                                             |
| `bookmarks`   | subquery  | Kiểm tra `is_bookmarked` (user đăng nhập)                                                        |

### Query (Django ORM)

```python
from django.db.models import Exists, OuterRef, Prefetch
from django.shortcuts import get_object_or_404
from apps.posts.models import Post, PostImage
from apps.files.models import File

# Prefetch post_images kèm file (đã có status='active' qua FK)
post_images_qs = PostImage.objects.select_related("file").filter(
    file__status="active"
).order_by("order")

qs = Post.objects.select_related("author", "category").prefetch_related(
    "tags",
    Prefetch("post_images", queryset=post_images_qs),
)

if request.user.is_authenticated:
    qs = qs.annotate(
        is_liked=Exists(Like.objects.filter(post=OuterRef("pk"), user=request.user)),
        is_bookmarked=Exists(Bookmark.objects.filter(post=OuterRef("pk"), user=request.user)),
    )

post = get_object_or_404(qs, pk=pk, is_deleted=False)
```

#### Resolve image blocks trong Serializer

```python
class PostDetailSerializer(serializers.ModelSerializer):
    content = serializers.SerializerMethodField()

    def get_content(self, instance):
        # Build lookup: file_id → url từ post_images đã prefetch
        file_url_map = {
            pi.file_id: pi.file.url
            for pi in instance.post_images.all()
        }
        blocks = instance.content or []
        resolved = []
        for block in blocks:
            if block.get("type") == "image":
                file_id = block["data"].get("file_id")
                block = {
                    **block,
                    "data": {
                        **block["data"],
                        "url": file_url_map.get(file_id),  # resolve tại đây
                    },
                }
            resolved.append(block)
        return resolved
```

#### Sync `post_images` khi save/update post

```python
# Trong PostSerializer.save() hoặc signal post_save
def sync_post_images(post):
    blocks = post.content or []
    image_blocks = [
        b for b in blocks if b.get("type") == "image"
    ]
    # Xóa ảnh cũ không còn trong content
    file_ids = [b["data"]["file_id"] for b in image_blocks]
    PostImage.objects.filter(post=post).exclude(file_id__in=file_ids).delete()
    # Upsert ảnh mới theo thứ tự block
    for order, block in enumerate(image_blocks):
        PostImage.objects.update_or_create(
            post=post,
            file_id=block["data"]["file_id"],
            defaults={
                "caption": block["data"].get("caption", ""),
                "order": order,
            },
        )
```

---

## 6. Response

### 200 OK

```json
{
  "id": 1,
  "title": "Getting Started with Django REST Framework",
  "content": [
    {
      "type": "heading",
      "data": { "text": "Giới thiệu Django REST Framework", "level": 2 }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Django là framework Python cho phép phát triển nhanh..."
      }
    },
    {
      "type": "image",
      "data": {
        "file_id": 42,
        "url": "https://cdn.blogproject.quanna.io.vn/posts/1/drf-architecture.webp",
        "caption": "Sơ đồ kiến trúc DRF",
        "alignment": "center"
      }
    },
    {
      "type": "paragraph",
      "data": { "text": "Serializer là thành phần trung tâm của DRF..." }
    },
    {
      "type": "image",
      "data": {
        "file_id": 43,
        "url": "https://cdn.blogproject.quanna.io.vn/posts/1/serializer-flow.webp",
        "caption": "Luồng xử lý Serializer",
        "alignment": "left"
      }
    }
  ],
  "category": {
    "id": 2,
    "name": "Backend Development"
  },
  "author": {
    "id": 1,
    "username": "johndoe"
  },
  "tags": [{ "id": 1, "name": "Django", "slug": "django" }],
  "likes_count": 47,
  "bookmarks_count": 12,
  "is_liked": false,
  "is_bookmarked": false,
  "created_at": "2024-01-14T10:00:00Z",
  "updated_at": "2024-01-15T08:00:00Z"
}
```

### Cấu trúc JSON của trường `content`

Trường `content` lưu trữ mảng (array) các "block" dùng để xây dựng nên nội dung của bài viết. Mỗi block có một loại (`type`) xác định cách hiển thị và dữ liệu (`data`) tương ứng.

| `type`      | Các thuộc tính trong `data`                                                         | Mô tả                                                                                                                                                               |
| :---------- | :---------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `heading`   | `text` (string)<br>`level` (integer)                                                | Tiêu đề con (vd: `level`: 2 tương ứng với `<h2>`).                                                                                                                  |
| `paragraph` | `text` (string)                                                                     | Đoạn văn bản (thường hỗ trợ định dạng HTML cơ bản nếu có).                                                                                                          |
| `image`     | `file_id` (integer)<br>`url` (string)<br>`caption` (string)<br>`alignment` (string) | Block hiển thị ảnh. Tại Backend sẽ tự động map `url` vào data dựa theo `file_id` trỏ vào `files` (thông qua prefetch `post_images`) để client có URL hiển thị tĩnh. |
| `list`      | `style` (`ordered`/`unordered`)<br>`items` (array của string)                       | Danh sách dưới dạng `ordered` (có số thứ tự) hoặc `unordered` (dấu chấm).                                                                                           |
| `quote`     | `text` (string)<br>`caption` (string)                                               | Trích dẫn đi kèm chú thích nguồn (nếu có).                                                                                                                          |

### 404 Not Found

```json
{
  "detail": "Not found."
}
```

---

## 7. Error Reference

| HTTP  | Nguyên nhân                          | Cách fix                            |
| ----- | ------------------------------------ | ----------------------------------- |
| `404` | Bài không tồn tại hoặc đã bị xóa mềm | Kiểm tra `id` và `is_deleted`       |
| `500` | Lỗi database                         | Kiểm tra kết nối DB, xem server log |

---

## 8. Related Files

| File                                                   | Mô tả                        |
| ------------------------------------------------------ | ---------------------------- |
| [UC2 — View Posts](uc02-view-posts.md)                 | Danh sách bài viết           |
| [UC4 — View Related Posts](uc04-view-related-posts.md) | Bài viết liên quan           |
| [UC5 — View Comments](uc05-view-comments.md)           | Danh sách bình luận của bài  |
| [UC21 — Upload Image](../user/uc21-upload-image.md)    | Upload ảnh trước khi tạo bài |
| [README](../README.md)                                 | API Documentation Index      |
