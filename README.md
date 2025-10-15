# Rangi Windows – Dispatcher UI (Frontend)

React + Vite + Tailwind CSS + Ant Design + FullCalendar.

This app currently runs 100% in the browser with no network calls. All data is stored in localStorage under the key `rw_projects`.

## Features
- Calendar view: shows project name / installer / status; click to open details.
- List view: project code, name, address, sales, installer, start/end date, status; supports search, status filter, and date range.
- Details drawer: project info, today’s task, progress note, upload a site photo (stored as a base64 data URL).
- One-click export: client-side Excel and PDF export for a selected date range.
- Quick create: fast project entry.

## Development
1) Install dependencies:
```bash
npm install
```

2) Start dev server:
```bash
npm run dev
```

Default URL: http://localhost:5173

No backend is required in the current offline mode.

## Production
```bash
npm run build
npm run preview
```

## Data storage and reset
- Storage: browser localStorage, key `rw_projects`.
- Reset data: open DevTools and clear site data, or run in console:
```js
localStorage.removeItem('rw_projects')
```

## Local API (src/api.js)
Browser-only implementation that persists to localStorage and performs client-side exports.

- listProjects({ q?, status?, start?, end?, includeArchived? }): Promise<Project[]>
- getProject(id): Promise<Project | undefined>
- createProject(values): Promise<Project>
- updateProject(id, values): Promise<Project>
- archiveProject(id, archived=true): Promise<Project>
- deleteProject(id): Promise<true>
- uploadPhoto(id, file: File): Promise<Project>  // photo_url is a base64 data URL
- exportExcel({ start, end }): downloads an .xlsx via `xlsx`
- exportPDF({ start, end }): downloads a .pdf

Project fields:
- id, project_code (auto: P-001, P-002, …), name, client_name, client_phone, address,
- sales_person, installer, team_members, start_date, end_date,
- status (defaults to "未开始"), today_task, progress_note, photo_url,
- archived (boolean, default false), created_at (ISO)

Dates are expected as YYYY-MM-DD strings.

## Export implementation
- Excel: `xlsx` (json_to_sheet, writeFile)
- PDF: client-side fallback for local mode; production should use backend export

## Switching to a real backend
The UI can switch between local and backend modes by environment flags.

- VITE_API_MODE=backend | local
- VITE_API_BASE=https://your-backend.example.com

In backend mode, the frontend calls the following REST APIs (axios client baseURL = VITE_API_BASE):

### Entity: Project
Fields:
- id: string | number
- project_code: string (unique, server-generated, e.g., P-001)
- name: string (1–100)
- client_name: string (0–100)
- client_phone: string (0–30)
- address: string (0–200)
- sales_person: string (0–100)
- installer: string (0–100)
- team_members: string (free text)
- start_date: string (YYYY-MM-DD)
- end_date: string (YYYY-MM-DD, >= start_date if both present)
- status: string (e.g., 未开始/施工中/完成)
- today_task: string
- progress_note: string
- photo_url: string (public URL; empty if none)
- archived: boolean (default false)
- created_at: string (ISO 8601)

### Endpoints

1) List projects
- GET {VITE_API_BASE}/api/projects
- Query (all optional unless noted):
  - q: string (full-text match on project_code, name, client_name, address)
  - status: string
  - start: string (YYYY-MM-DD)
  - end: string (YYYY-MM-DD)
  - archived: boolean (true|false). Default: false (exclude archived). If omitted, treat as false.
    - Alternatively support includeArchived=true for compatibility.
  - page: integer >=1 (default 1)
  - pageSize: integer 1–200 (default 50)
  - sortBy: one of [created_at, start_date, end_date, project_code] (default created_at)
  - sortOrder: asc|desc (default desc)
- 200 Response (preferred):
  {
    "items": Project[],
    "page": number,
    "pageSize": number,
    "total": number
  }
- 200 Response (also supported, simpler): Project[]

2) Get project by id
- GET {VITE_API_BASE}/api/projects/:id
- 200 Response: Project
- 404 if not found

3) Create project
- POST {VITE_API_BASE}/api/projects
- Body (JSON):
  {
    "name": string,
    "client_name"?: string,
    "client_phone"?: string,
    "address"?: string,
    "sales_person"?: string,
    "installer"?: string,
    "team_members"?: string,
    "start_date"?: "YYYY-MM-DD",
    "end_date"?: "YYYY-MM-DD",
    "status"?: string,            // default 未开始
    "today_task"?: string,
    "progress_note"?: string
  }
- Server generates: id, project_code, created_at, archived=false
- 201 Response: Project

4) Update project (partial)
- PATCH {VITE_API_BASE}/api/projects/:id
- Body: partial Project fields (except id, project_code, created_at)
- 200 Response: Project
- 404 if not found

5) Archive / Unarchive project
- PATCH {VITE_API_BASE}/api/projects/:id
- Body: { "archived": true | false }
- 200 Response: Project (with updated archived flag)
- 404 if not found
- Idempotent: applying the same archived value twice should return 200 with no side effects

6) Delete project
- DELETE {VITE_API_BASE}/api/projects/:id
- 204 No Content (preferred) or 200 { "success": true }
- 404 if not found
- Side effects: remove the record and any photo linkage; if soft deletion is required, expose archived=true instead and avoid DELETE

7) Upload project photo
- POST {VITE_API_BASE}/api/projects/:id/photo
- Content-Type: multipart/form-data
- Field name: file (image/*, <= 5MB recommended)
- Behavior: store file, produce public URL, update project.photo_url
- 200 Response: Project
- 404 if not found; 415 unsupported type; 413 too large

8) Export Excel
- GET {VITE_API_BASE}/api/projects/export/excel?start=YYYY-MM-DD&end=YYYY-MM-DD&archived=false
- Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Filename: 施工安排表_{start}_{end}.xlsx (Content-Disposition)
- By default exclude archived unless archived=true or includeArchived=true is specified

9) Export PDF
- GET {VITE_API_BASE}/api/projects/export/pdf?start=YYYY-MM-DD&end=YYYY-MM-DD&archived=false
- Response: application/pdf
- Filename: 施工安排表_{start}_{end}.pdf (Content-Disposition)
- By default exclude archived unless archived=true or includeArchived=true is specified

### Filtering and overlap logic
- For list and exports, include projects whose [start_date, end_date] overlaps [start, end].
- If only one boundary provided, treat as open interval on the other side.

### Validation rules
- name required (1–100).
- status must be one of allowed values.
- start_date and end_date, if both provided, must be valid dates and end_date >= start_date.
- Strings trimmed; reject control characters.
- client_phone: basic length check (<=30); no strict E.164 required.

### Errors (consistent shape)
- Status codes: 400 validation_error, 401 unauthorized, 403 forbidden, 404 not_found, 409 conflict (e.g., duplicate project_code), 413 payload_too_large, 415 unsupported_media_type, 500 internal_error.
- Body shape:
  {
    "error": {
      "code": "validation_error",
      "message": "Human readable message",
      "details": { "field": "reason", ... } // optional
    }
  }

### Security and ops
- CORS: configurable allowlist; include credentials flag off by default.
- Rate limiting: at least per-IP basic limits for write and upload routes.
- Logging: log request id, method, path, status, latency; redact PII in logs.
- Idempotency: accept optional Idempotency-Key header for POST /api/projects to prevent duplicates; PATCH archive is idempotent.
- Pagination: enforce sane defaults and maximum pageSize 200.
- File storage: store photos in object storage (e.g., S3) or local disk; photo_url must be HTTP(S) accessible.

### Examples

Archive (set archived=true)
Request:
PATCH /api/projects/101
{
  "archived": true
}

Response 200:
{
  "id": 101,
  "project_code": "P-101",
  "name": "Kitchen remodel",
  "archived": true,
  // ...other fields...
}

Unarchive
PATCH /api/projects/101
{
  "archived": false
}

Delete
DELETE /api/projects/101
204 No Content

List excluding archived (default)
GET /api/projects?q=Queen&status=施工中

List including archived
GET /api/projects?q=Queen&status=施工中&archived=true

Export (excluding archived)
GET /api/projects/export/excel?start=2025-03-01&end=2025-03-31

Export including archived
GET /api/projects/export/pdf?start=2025-03-01&end=2025-03-31&archived=true
