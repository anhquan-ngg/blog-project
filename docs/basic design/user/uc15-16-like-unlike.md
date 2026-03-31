# UC15 & UC16 — Like / Unlike Post

**Endpoint:** `POST /api/posts/{id}/like/`

**Role:** User (authentication required)

---

## Like hoặc Unlike bài viết

Toggle bằng `Like.objects.get_or_create()`:

- Gọi lần 1 → like (UC15)
- Gọi lần 2 → unlike (UC16)

### Parameters

- `id` (integer, required) - Post ID

### Request

```
POST /api/posts/1/like/ HTTP/1.1
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

### Response 200 (application/json) - UC15 (Like)

```json
{
  "liked": true,
  "likes_count": 48
}
```

### Response 200 (application/json) - UC16 (Unlike)

```json
{
  "liked": false,
  "likes_count": 47
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
- [UC17 — View Liked Posts](uc17-view-liked.md)
