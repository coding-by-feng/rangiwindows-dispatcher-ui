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

- listProjects({ q?, status?, start?, end? }): Promise<Project[]>
- getProject(id): Promise<Project | undefined>
- createProject(values): Promise<Project>
- updateProject(id, values): Promise<Project>
- uploadPhoto(id, file: File): Promise<Project>  // photo_url is a base64 data URL
- exportExcel({ start, end }): downloads an .xlsx via `xlsx`
- exportPDF({ start, end }): downloads a .pdf via `jspdf` + `jspdf-autotable`

Project fields:
- id, project_code (auto: P-001, P-002, …), name, client_name, client_phone, address,
- sales_person, installer, team_members, start_date, end_date,
- status (defaults to "未开始"), today_task, progress_note, photo_url, created_at (ISO)

Dates are expected as YYYY-MM-DD strings.

## Export implementation
- Excel: `xlsx` (json_to_sheet, writeFile)
- PDF: `jspdf` + `jspdf-autotable`

## Switching to a real backend (future)
Keep the same function signatures in `src/api.js`. Replace the local implementations with HTTP calls (axios/fetch), or branch by a flag, for example:
- VITE_API_MODE=backend
- VITE_API_BASE=https://your-backend.example.com

Proposed REST contract:
- GET /api/projects?q&status&start&end
- GET /api/projects/:id
- POST /api/projects
- PUT /api/projects/:id
- POST /api/projects/:id/photo  (multipart field: photo)
- GET /api/export/excel?start&end
- GET /api/export/pdf?start&end

Response fields should include:
id, project_code, name, client_name, client_phone, address, sales_person, installer, team_members, start_date, end_date, status, progress_note, today_task, photo_url (use ISO dates where applicable).

## Backend API requirements

Goal
- Provide REST APIs that mirror the current frontend local API in src/api.js so the UI can switch by flipping a flag without code changes (same function signatures and field names).

Switching mechanism (frontend expectation)
- Keep function names: listProjects, getProject, createProject, updateProject, uploadPhoto, exportExcel, exportPDF.
- Env flags:
  - VITE_API_MODE=backend | local
  - VITE_API_BASE=https://api.example.com
- CORS: allow http://localhost:5173 and the production origin.

Conventions
- Base URL: {VITE_API_BASE}/api
- Auth: Bearer <token> via Authorization header (optional for now; make endpoints work with auth disabled if not configured).
- Content-Type: application/json (except photo upload).
- Encoding: UTF-8; allow Chinese text.
- Dates:
  - start_date, end_date: YYYY-MM-DD
  - created_at: ISO 8601 UTC
- IDs: server-generated numeric or string; project_code must be unique (format like P-001).

Entity: Project
- Fields:
  - id: string | number
  - project_code: string (unique, server-generated, e.g., P-001)
  - name: string (1–100)
  - client_name: string (0–100)
  - client_phone: string (0–30)
  - address: string (0–200)
  - sales_person: string (0–100)
  - installer: string (0–100)
  - team_members: string (free text; keep as string to match current UI)
  - start_date: string (YYYY-MM-DD)
  - end_date: string (YYYY-MM-DD, >= start_date if both present)
  - status: string (one of: 未开始, 进行中, 已完成; extensible)
  - today_task: string
  - progress_note: string
  - photo_url: string (public URL; empty if none)
  - created_at: string (ISO 8601)

Endpoints

1) List projects
- GET /api/projects
- Query:
  - q: string (full-text match on project_code, name, client_name, address)
  - status: string
  - start: string (YYYY-MM-DD)
  - end: string (YYYY-MM-DD)
  - page: integer >=1 (default 1)
  - pageSize: integer 1–200 (default 50)
  - sortBy: one of [created_at, start_date, end_date, project_code] (default created_at)
  - sortOrder: asc|desc (default desc)
- 200 Response:
  {
    "items": Project[],
    "page": number,
    "pageSize": number,
    "total": number
  }

2) Get project by id
- GET /api/projects/:id
- 200 Response: Project
- 404 if not found

3) Create project
- POST /api/projects
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
- Server generates: id, project_code, created_at; validates date order and status.
- 201 Response: Project

4) Update project
- PUT /api/projects/:id
- Body: partial Project fields (except id, project_code, created_at)
- 200 Response: Project
- 404 if not found

5) Upload project photo
- POST /api/projects/:id/photo
- Content-Type: multipart/form-data
- Field: photo (file, image/*, <= 5MB recommended)
- Behavior: store file, produce public URL, update project.photo_url
- 200 Response: Project
- 404 if not found
- 415 if unsupported media type
- 413 if payload too large

6) Export Excel
- GET /api/export/excel?start=YYYY-MM-DD&end=YYYY-MM-DD
- Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Filename: 施工安排表_{start}_{end}.xlsx
- Columns (order): 项目编号, 项目名称, 客户, 地址, 销售, 安装, 开始日期, 结束日期, 状态

7) Export PDF
- GET /api/export/pdf?start=YYYY-MM-DD&end=YYYY-MM-DD
- Response: application/pdf
- Filename: 施工安排表_{start}_{end}.pdf
- Table columns same as Excel

Filtering and overlap logic
- For list and exports, include projects whose [start_date, end_date] overlaps [start, end].
- If only one boundary provided, treat as open interval on the other side.

Validation rules
- name required (1–100).
- status must be one of allowed values.
- start_date and end_date, if both provided, must be valid dates and end_date >= start_date.
- Strings trimmed; reject control characters.
- client_phone: basic length check (<=30); no strict E.164 required.

Errors (consistent shape)
- Status codes: 400 validation_error, 401 unauthorized, 403 forbidden, 404 not_found, 409 conflict (e.g., duplicate project_code), 413 payload_too_large, 415 unsupported_media_type, 500 internal_error.
- Body:
  {
    "error": {
      "code": "validation_error",
      "message": "Human readable message",
      "details": { "field": "reason", ... } // optional
    }
  }

Security and ops
- CORS: configurable allowlist; include credentials flag off by default.
- Rate limiting: at least per-IP basic limits for write and upload routes.
- Logging: log request id, method, path, status, latency; redact PII in logs.
- Idempotency: accept optional Idempotency-Key header for POST /api/projects to prevent duplicates.
- Pagination: enforce sane defaults and maximum pageSize 200.
- File storage: store photos in object storage (e.g., S3) or local disk; photo_url must be HTTP(S) accessible.

Sample payloads

Create
{
  "name": "Kitchen remodel",
  "client_name": "张三",
  "client_phone": "021-12345678",
  "address": "123 Queen St, Auckland",
  "sales_person": "Alice",
  "installer": "Bob",
  "team_members": "Bob; Carol",
  "start_date": "2025-03-01",
  "end_date": "2025-03-05",
  "status": "未开始",
  "today_task": "",
  "progress_note": ""
}

Response
{
  "id": 101,
  "project_code": "P-101",
  "name": "Kitchen remodel",
  "client_name": "张三",
  "client_phone": "021-12345678",
  "address": "123 Queen St, Auckland",
  "sales_person": "Alice",
  "installer": "Bob",
  "team_members": "Bob; Carol",
  "start_date": "2025-03-01",
  "end_date": "2025-03-05",
  "status": "未开始",
  "today_task": "",
  "progress_note": "",
  "photo_url": "",
  "created_at": "2025-02-10T08:12:34.000Z"
}
