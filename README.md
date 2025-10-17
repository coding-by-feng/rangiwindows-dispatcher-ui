# Rangi Windows 施工安排系统 UI

React + Vite + Tailwind CSS + Ant Design + FullCalendar.

This app uses a real backend by default. Backend hostname: http://192.168.1.120

## Features
- Calendar view: shows project name / installer / status; click to open details.
- List view: project code, name, address, sales, installer, start/end date, status; supports search, status filter, and date range.
- Details drawer: project info, today’s task, progress note, upload a site photo (stored on server; photo_url is a public URL).
- One-click export: server-generated Excel and PDF for a selected date range.
- Quick create: fast project entry.
- Archive/unarchive projects; optional include-archived listing.

## Development
1) Ensure the backend is reachable at:
   - http://192.168.1.120

2) Install dependencies:
```bash
npm install
```

3) Start dev server:
```bash
npm run dev
```

Default URL: http://localhost:5173

Env (already configured):
- .env.development
  - VITE_API_MODE=backend
  - VITE_API_BASE=http://192.168.1.120
- .env.test (for Playwright)
  - VITE_API_MODE=local
  - VITE_API_BASE=http://192.168.1.120

## Production
```bash
npm run build
npm run preview
```
At runtime, set:
- VITE_API_MODE=backend
- VITE_API_BASE=http://192.168.1.120  # or your deployed BE URL

## API modes
- backend (default): real REST APIs on http://192.168.1.120
- local: offline fallback using localStorage (used by tests)

Switch via environment:
- VITE_API_MODE=backend | local
- VITE_API_BASE=http://192.168.1.120

## Data storage and reset
- Backend mode: server DB/storage (see BE spec).
- Local mode (tests/dev offline): browser localStorage, key rw_projects.
- Reset local data in console:
```js
localStorage.removeItem('rw_projects')
```

## Frontend API surface (src/api.js)
These functions call the backend in backend mode; in local mode they persist to localStorage.

- listProjects({ q?, status?, start?, end?, includeArchived? }): Promise<Project[] | {items, page, pageSize, total}>
- getProject(id): Promise<Project | null>
- createProject(values): Promise<Project>
- updateProject(id, values): Promise<Project>
- archiveProject(id, archived=true): Promise<Project>
- deleteProject(id): Promise<true>
- uploadPhoto(id, file: File): Promise<Project>
- exportExcel({ start, end }): download .xlsx from BE
- exportPDF({ start, end }): download .pdf from BE

Project fields:
- id, project_code (server-generated), name, client_name, client_phone, address,
- sales_person, installer, team_members, start_date, end_date,
- status (e.g., 未开始/施工中/完成), today_task, progress_note, photo_url,
- archived (boolean), created_at (ISO)

Dates are YYYY-MM-DD strings.

## Backend API requirements (copy-paste for implementation)
Base URL: http://192.168.1.120
All JSON responses use UTF-8. File exports return binary with correct Content-Type and Content-Disposition.

Entity: Project
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
- photo_url: string (public HTTP(S) URL; empty if none)
- archived: boolean (default false)
- created_at: string (ISO 8601)

Endpoints

1) List projects
- GET /api/projects
- Query (all optional unless noted):
  - q: string (match project_code, name, client_name, address)
  - status: string
  - start: YYYY-MM-DD
  - end: YYYY-MM-DD
  - archived: boolean (default false). If omitted, treat as false. Optionally support includeArchived=true.
  - page: integer >=1 (default 1)
  - pageSize: integer 1–200 (default 50)
  - sortBy: created_at | start_date | end_date | project_code (default created_at)
  - sortOrder: asc | desc (default desc)
- 200 Response (preferred):
  {
    "items": Project[],
    "page": number,
    "pageSize": number,
    "total": number
  }
- Also acceptable: Project[] (no pagination)

2) Get project
- GET /api/projects/:id
- 200: Project
- 404: not found

3) Create project
- POST /api/projects
- Body:
  {
    "name": string,                       // required
    "client_name"?: string,
    "client_phone"?: string,
    "address"?: string,
    "sales_person"?: string,
    "installer"?: string,
    "team_members"?: string,
    "start_date"?: "YYYY-MM-DD",
    "end_date"?: "YYYY-MM-DD",
    "status"?: string,                    // default 未开始
    "today_task"?: string,
    "progress_note"?: string
  }
- Server generates: id, project_code, created_at, archived=false
- 201: Project

4) Update project (partial)
- PATCH /api/projects/:id
- Body: partial Project fields (except id, project_code, created_at)
- 200: Project
- 404: not found

5) Archive / Unarchive project
- PATCH /api/projects/:id
- Body: { "archived": true | false }
- 200: Project
- 404: not found
- Idempotent

6) Delete project
- DELETE /api/projects/:id
- 204 No Content (preferred) or 200 { "success": true }
- 404: not found
- If soft-delete is required, omit DELETE and rely on archived=true

7) Upload project photo
- POST /api/projects/:id/photo
- Content-Type: multipart/form-data
- Field: file (image/*, <= 5MB recommended)
- Behavior: store file, produce public URL, update project.photo_url
- 200: Project
- 404: not found; 415: unsupported type; 413: too large

8) Export Excel
- GET /api/projects/export/excel?start=YYYY-MM-DD&end=YYYY-MM-DD&archived=false
- Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Filename: 施工安排表_{start}_{end}.xlsx

9) Export PDF
- GET /api/projects/export/pdf?start=YYYY-MM-DD&end=YYYY-MM-DD&archived=false
- Response: application/pdf
- Filename: 施工安排表_{start}_{end}.pdf

Filtering and overlap logic
- For list and exports, include projects whose [start_date, end_date] overlaps [start, end].
- If only one boundary provided, treat the other side as open.

Validation
- name required (1–100).
- status must be one of allowed values.
- start_date and end_date valid if present; end_date >= start_date.
- Trim strings; reject control characters.
- client_phone: length <= 30; no strict E.164 required.

Errors (consistent shape)
- Status codes: 400 validation_error, 401 unauthorized, 403 forbidden, 404 not_found, 409 conflict, 413 payload_too_large, 415 unsupported_media_type, 500 internal_error.
- Body:
  {
    "error": {
      "code": "validation_error",
      "message": "Human readable message",
      "details": { "field": "reason", ... } // optional
    }
  }

Security and ops
- CORS: configurable allowlist; credentials disabled by default.
- Rate limiting: per-IP limits for write/upload routes.
- Logging: request id, method, path, status, latency; redact PII.
- Idempotency: optional Idempotency-Key for POST /api/projects.
- Pagination: default and max pageSize 200 enforced.
- File storage: object storage or disk; photo_url must be HTTP(S) accessible.

## API Status Codes

The frontend now uses English status codes in payloads/filters and renders Chinese labels in the UI. Backend teams should review and adopt these codes. See docs/API_STATUS.md for details.

Examples
- Archive:
  - PATCH http://192.168.1.120/api/projects/101
    { "archived": true }
- Unarchive:
  - PATCH http://192.168.1.120/api/projects/101
    { "archived": false }
- Delete:
  - DELETE http://192.168.1.120/api/projects/101
    204 No Content
- List excluding archived (default):
  - GET http://192.168.1.120/api/projects?q=Queen&status=施工中
- List including archived:
  - GET http://192.168.1.120/api/projects?q=Queen&status=施工中&archived=true
- Export (excluding archived):
  - GET http://192.168.1.120/api/projects/export/excel?start=2025-03-01&end=2025-03-31
- Export including archived:
  - GET http://192.168.1.120/api/projects/export/pdf?start=2025-03-01&end=2025-03-31&archived=true
