# Blog API + Mobile

Django REST Framework is the backend. The Android/iOS client is an Expo React Native application in `mobile/`. The former server-rendered blog UI is removed; Django Admin and OpenAPI documentation remain available.

## Backend setup (Windows PowerShell)

Use Python 3.12+ and PostgreSQL 17. Do not use the historical `db.sqlite3`: search depends on PostgreSQL full-text search, unaccent and trigram extensions.

```powershell
py -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` with database credentials, a unique `SECRET_KEY`, and S3 credentials/bucket. Never commit credentials. If `.env` already exists, preserve it instead of copying over it. Set `DB_HOST=localhost` for a local database. The optional compose service creates a PostgreSQL instance; it exposes `DB_PORT` on the host:

```powershell
docker compose up -d db
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py createsuperuser
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

The migration user needs permission to install `unaccent` and `pg_trgm` in its database. Reusing an existing Docker volume does not reset its database credentials when `.env` changes. Resolve credentials without deleting production data or volumes.

- `/` and `/api/`: JSON API metadata (not a database readiness probe).
- `/api/docs/`, `/api/redoc/`, `/api/schema/`: API documentation/schema.
- `/admin/`: Django Admin for operational access, not the old blog FE.
- Application API responses use JSON only; Browsable API is disabled.
- Uploads retain the existing JPEG/PNG/WebP, 5 MB and S3 contracts. Configure a bucket whose uploaded URLs are readable by the client; no mock storage is enabled in the application.

## Mobile setup

Requires Node.js 22.13+. See `mobile/README.md` for Expo installation, environment variables, device setup, scripts and supported flows. Use the backend's `/api/` URL as the client API base, not a Django HTML route.

```powershell
Set-Location mobile
npm ci
Copy-Item .env.example .env
# Set EXPO_PUBLIC_API_URL to the reachable backend /api/ URL.
npm start
```

Mobile checks: `npm run typecheck`, `npm test`, `npm run doctor`, and `npm run export`. The export script produces Android/iOS JavaScript bundles and assets, not signed APK/IPA binaries. iOS Simulator requires macOS; on Windows use a physical iPhone with Expo Go or an appropriate cloud development build.

Drafts are device-local, unencrypted and account-scoped, not server-synchronized. Eight transitive Expo-tooling advisories remain documented in `mobile/README.md`; no incompatible forced dependency downgrade was applied. Review these before release.

On an Android emulator, reach the development computer via `10.0.2.2`; on the iOS simulator use `localhost`. A physical phone must use the computer's LAN IP, be on the same network, and be allowed through the development firewall. Add that exact IP to backend `ALLOWED_HOSTS`. Binding to `0.0.0.0` does not change host validation.

Native requests use `Authorization: Token <token>`; they do not depend on browser cookies or CORS. The app stores native authentication in SecureStore. Use HTTPS, `DEBUG=False`, a real secret key and explicit hosts in production. Collect the Django Admin assets with `manage.py collectstatic --noinput` and serve `STATIC_ROOT` through the deployment web server.

## Preserved API contracts

| Flow | API |
| --- | --- |
| Registration, login, logout, profile | `/api/auth/register/`, `/api/auth/login/`, `/api/auth/logout/`, `/api/auth/me/` |
| Feed, author/category/tag filters, search, related content | `/api/posts/`, `/api/posts/search/`, `/api/posts/{id}/related/` |
| Article create/edit/delete | `/api/posts/`, `/api/posts/{id}/` |
| Images | multipart `image` to `/api/files/upload/` |
| Likes and bookmarks | `/api/posts/{id}/like/`, `/api/posts/{id}/bookmark/` |
| Personal libraries | `/api/me/liked/`, `/api/me/bookmarks/` (auth-prefixed aliases retained) |
| Comment/reply creation and editing/deletion | `/api/posts/{id}/comments/`, `/api/comments/{id}/` |
| Notifications/read status | `/api/notifications/`, `/api/notifications/{id}/read/` |
| Category administration | `/api/categories/`, `/api/categories/{id}/` |
| Tags (writes available to authenticated users) | `/api/tags/`, `/api/tags/{id}/` |
| Admin user management and CSV | `/api/admin/users/`, ban/unban actions, users/posts import/export |

Post content remains structured EditorJS-style blocks, not an HTML string. Do not change it to a different representation in the database. Categories/tags return arrays; posts and personal libraries use limit/offset pagination. Registration requires `password_confirm` and does not itself return a token. Profile updates change only first/last name. There is no server-side draft/status field.

## Validation

Run against a disposable PostgreSQL database, not production. Django creates/drops a `test_` database, and the configured database role needs `CREATEDB`:

```powershell
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py test blog_project --noinput
.\venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\venv\Scripts\python.exe manage.py spectacular --validate --fail-on-warn
```

Integration tests cover API-only routing, retained Admin/docs, schema validation, authentication/token revocation, profile, feed/search/pagination, article permissions/CRUD, likes/bookmarks/libraries, notifications/ownership, comments/replies, image multipart and admin CSV/ban/unban/taxonomy. Only the S3 network call is mocked in upload tests; PostgreSQL full-text search and database persistence are real.

Migrations are versioned so a fresh database can be reproduced. Existing unrelated worktree edits are intentionally retained. Native-device UI, OS permission dialogs, real S3 uploads and release signing must also be checked on Android/iOS before release.
