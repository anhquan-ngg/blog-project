# UC18 & UC19 — Bookmark / Unbookmark Post

**Endpoint:** `POST /api/posts/{id}/bookmark/`

**Role:** User (authentication required)

---

## Bookmark hoặc Unbookmark bài viết

Toggle bằng `Bookmark.objects.get_or_create()`:

- Gọi lần 1 → bookmark (UC18)
- Gọi lần 2 → unbookmark (UC19)

### Parameters

- `id` (integer, required) - Post ID

### Request

```
POST /api/posts/1/bookmark/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Response 200 (application/json) - UC18 (Bookmark)

```json
{
  "bookmarked": true,
  "bookmarks_count": 13
}
```

### Response 200 (application/json) - UC19 (Unbookmark)

```json
{
  "bookmarked": false,
  "bookmarks_count": 12
}
```

### Response 401 (application/json)

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### Response 404 (application/json)

```json
{
  "detail": "Not found."
}
```

---

## Related Files

- [README](../README.md) - API Documentation Index
- [UC20 — View Bookmarks](uc20-view-bookmarks.md)
