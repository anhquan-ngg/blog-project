# Stride Blog Mobile

A native Android/iOS Expo + TypeScript client for this repository's Django REST API. Editorial monochrome layouts, square imagery, pill actions, and open-licensed Barlow Condensed/Manrope typography follow `..\UI-GUIDELINE.md`. The app does not load the former web frontend or embed a website.

## Run

Requirements: Node.js 22.13+ (validated with 22.22), npm, an SDK 58-compatible Expo Go installation or development build, and the Django backend. Expo SDK 58, React 19.3 and React Native 0.88 are pinned in the lockfile. Install the matching Expo Go version if your device currently has an older SDK.

```powershell
Set-Location mobile
npm ci
Copy-Item .env.example .env
# Edit EXPO_PUBLIC_API_URL for your device.
npm start
```

Use `npm run android` to open an Android emulator. Use `npm run ios` on macOS with an iOS simulator; Windows cannot run Xcode/iOS simulators. A physical iPhone can use Expo Go or an EAS development build.

API addresses:

- Android emulator: `http://10.0.2.2:8000/api` (the default).
- iOS simulator: `http://127.0.0.1:8000/api`.
- Physical devices: your computer's LAN address, for example `http://192.168.1.20:8000/api`; bind Django to `0.0.0.0:8000`, allow that host, and permit LAN access through the firewall.
- Releases: an accessible **HTTPS** API. Native transport security may block HTTP outside Expo Go; this app does not weaken production transport security.

### Android Local-Network Permission

On Android 17 / API 37, check Expo Go's local-network permission if Chrome can reach the API but the app reports network errors or timeouts. Browser access does not verify Expo Go's permissions. On the tested emulator, Expo Go 58.0.5 declared `android.permission.ACCESS_LOCAL_NETWORK` but it was not granted.

Allow local-network access in Android Settings for Expo Go, or explicitly grant it on your development emulator:

```powershell
adb -s emulator-5554 shell pm grant host.exp.exponent android.permission.ACCESS_LOCAL_NETWORK
```

Use the device ID from `adb devices` if it differs. This command is specific to Expo Go on Android versions that support this permission; it is not a production permission-request implementation. Keep the emulator API URL as `http://10.0.2.2:8000/api`. If you changed the environment value, stop Metro and restart it from the mobile directory with `npx expo start --clear --android`, then retry the app.

A bare origin or deployment prefix also works: `/api` is appended once. Restart Metro after changing environment values (`npx expo start --clear` if necessary). `EXPO_PUBLIC_` variables are public bundle configuration, never secrets. No backend tokens, S3 credentials, or private keys belong in this directory.

## Features

- Guest story feed, submitted search, category and tag filters, popularity sorting, responsive cards, related stories, and native-rendered article HTML.
- Registration, login, logout/revocation, profile name editing, own stories, liked and bookmarked libraries.
- Block editor with real editable HTML, bold/italic actions, headings, image selection/upload, captions/alignment, ordering, preview, and preservation of existing unknown blocks through JSON editing.
- Account-scoped **local drafts**, stored only in this app's AsyncStorage on this device. There is no server draft field/endpoint or cross-device draft synchronization. Logout keeps drafts for the same account; uninstalling/removing app data removes them. Local drafts are not encrypted, so avoid sensitive content on shared devices.
- Story create/update/delete; likes/bookmarks; root comments and nested replies, own-comment editing, image replacement/removal, and owner/staff deletion.
- Paginated notifications with explicit mark-read and story navigation.
- Authenticated tag create/update/delete (ordinary members too). Administrator-only category create/update/delete with parent selection.
- Staff user directory with username/email/name search and confirmed ban/unban, staff story search/deletion, and native CSV import/export.
- `strideblog://story/123` deep links and native sharing. Install a standalone/development build to register the scheme; Expo Go has its own development link format.

Search supports `q` and category, while the standard feed supports tag slug and ordering. The API does not expose server user search: admin search fetches every user page, filters locally, and paginates results. This preserves completeness but is expensive for very large directories; a future server search parameter would improve it.

## API And Session Contracts

All routes use `/api/` and `Authorization: Token <token>` (not cookies or Bearer). The API module centralizes trailing slashes, query encoding, multipart handling, readable nested DRF validation errors, timeouts, cancellation, and 401 invalidation. Filters and account changes abort/suppress stale responses. Pagination deduplicates identities while advancing offsets by actual server rows.

Native tokens are stored with Expo SecureStore; user identity is verified via `/auth/me/` before private screens exist. Offline restoration presents retry/local sign-out, not a cached private identity. Secure writes are serialized so logout cannot race login into restoring an old token. Private navigation history resets for account/staff changes. Logout removes local identity immediately even if remote revocation fails; a failed secure deletion must be retried before proceeding.

Registration returns a user, not a token; login follows successful registration. Profile PATCH only sends changed first/last names. Post bodies send `title`, integer `category`, integer-array `tags`, and EditorJS `content` **block arrays**, never a raw HTML string or invented draft status. Image blocks retain `file_id`; server responses supply display URLs. Nullable/deleted authors and category relations are handled defensively.

Categories use POST/PUT with explicit `parent_id: null` for roots; category PATCH is not supported. Tags use POST/PATCH and authenticated writes. Comment image PATCH omits `file_id` to retain an attachment and sends `null` to remove it. Notification read PATCH returns a detail message, so the app updates read state after success.

### Images

The device photo library is requested only when selecting an image. Images are resized when necessary, converted to JPEG, and checked against the API's 5 MB limit. Uploads use multipart field `image`. Temporary converted files are removed after upload. Real uploads require working backend S3 credentials/bucket configuration; the app cannot replace that backend prerequisite. Android/iOS permissions and actual uploads still need device testing against configured storage.

### CSV

Staff imports use the native document picker, `.csv` validation, 10 MB maximum, multipart field `file`, confirmation, and row-by-row partial-success reporting. Exports use an authenticated API fetch followed by native file sharing; tokens are never put in download URLs. Cached export/import files are cleaned up after use. An exported/shared copy is under the recipient app's control.

- Posts import headers: `title,content,category_name`; imported content is plain text, and the importing staff member is the author.
- Users import headers: `username,email,password,first_name,last_name`.
- Exports support date range and post category or user active/staff flags.
- Export CSVs are not guaranteed round-trip import formats. User exports intentionally have no passwords.
- CSV requests use `Accept: */*`: `Accept: text/csv` fails DRF content negotiation when the backend has only its JSON renderer, even though the endpoint returns a CSV response.

## Structure

- `App.tsx`: fonts, public/private/staff native navigation, session gates.
- `src\api`: typed contracts, transport, endpoint operations.
- `src\session`: pure race-safe controller and SecureStore/React adapter.
- `src\hooks`: cancellable resources and offset pagination.
- `src\components`: native HTML rendering, comments, shared editorial controls/cards.
- `src\screens`: feed, auth, detail, editor, library, account, inbox, administration, taxonomy.
- `src\utils`: URL/content normalization, local draft persistence, native image/CSV operations.
- `tests`: Node/tsx transport, endpoint, session-race, content, pagination and draft tests.
- `licenses`: font OFL notices and package MIT notice. Fonts are bundled locally, not downloaded at runtime.

## Verify And Build

```powershell
npm run typecheck
npm test
npx expo install --check
npm run doctor
npm run export
```

`export` creates ignored `dist` production Hermes bundles for both Android and iOS. A successful export is not a signed installable binary or device UI test. For store/development binaries, use Expo's EAS Build service or, on supported native toolchains, `npx expo run:android` / `npx expo run:ios`. Configure your own bundle identifiers, signing credentials, icons, splash artwork, EAS project, and production API before publishing. Generated native directories/build outputs are not source deliverables.

Validated: TypeScript, 35 automated tests, Expo dependency compatibility, all 20 Expo Doctor checks, and Android/iOS production export. The actual API client also passed live HTTP smoke checks against a disposable backend: guest feed/taxonomy, registration, Token login/me/profile, ordinary-member tag CRUD, paginated libraries/inbox, and logout/token revocation. Actual phone/simulator interaction and backend S3 uploads are not validated in this environment.

An optional repeatable smoke runner is included. By default it only reads public endpoints. Opt-in mutation checks create a test account (which remains until you discard the test database), create/update/delete a tag, and revoke the test token. Never run mutations against production.

```powershell
$env:MOBILE_SMOKE_API_URL='http://127.0.0.1:8000/api'
npx tsx tests\live-smoke.ts
# Only against a disposable test database:
$env:MOBILE_SMOKE_MUTATIONS='1'
npx tsx tests\live-smoke.ts
```

The current dependency audit reports transitive Expo CLI/configuration advisories for `zod` and `deepmerge` (8 aggregate reports: 3 high, 5 low). The installed Expo CLI uses Zod 3; the suggested major Zod 4 override would break its contract, and deepmerge currently has no newer release. `npm audit fix --force` suggests downgrading Expo to SDK 51, so it is intentionally not applied. These packages belong to build/development tooling, not the app's API/session source. Recheck upstream compatible updates before production distribution and do not expose the development server publicly.

Native acceptance checklist: verify first launch/offline/401/logout, all guest filters and links, registration/profile, local drafts after restart/account switch, publish/edit/delete and permissions, image pick/upload/remove, comment reply/edit/delete, likes/bookmarks, notification paging/read, member tag CRUD, staff category PUT/root parent handling, ban/unban confirmation, and CSV picker/share/partial errors on both Android and iOS.
