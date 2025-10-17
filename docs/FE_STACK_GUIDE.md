# Frontend Stack Guide (for Vue developers)

This guide explains the frontend stack used by this project and helps you get productive quickly if you come from a Vue background. It covers React (JSX + hooks), Vite, Tailwind CSS, Ant Design, FullCalendar, i18n, the API layer, and testing with Playwright. You’ll also find practical recipes to implement common features in this codebase.

- Repo: Rangi Windows 施工安排系统 UI (React + Vite + Tailwind CSS + Ant Design + FullCalendar)
- Target audience: Vue developers with basic knowledge of modern frontend tooling
- Goals:
  - Map Vue concepts to React equivalents
  - Explain how this project is wired (build, i18n, API modes, styling)
  - Provide hands-on steps to add features safely

---

## 1) Project tour and quickstart

### 1.1 Folder structure (relevant parts)

```
src/
  App.jsx                 # Root app component
  main.jsx                # App entry, mounts React into #root
  styles.css              # Tailwind base + global styles
  api.js                  # API client + local fallback + file exports
  i18n/                   # React i18next setup
    index.js
  locales/                # Translation dictionaries (en, zh-CN, zh-TW)
    en.json
    zh-CN.json
    zh-TW.json
  components/
    HeaderBar.jsx
    ProjectTable.jsx
    ProjectDrawer.jsx
    CreateProjectModal.jsx
    CalendarView.jsx

docs/
  FE_STACK_GUIDE.md       # This guide

.env.*                    # Environment configurations for Vite runtime
vite.config.js            # Vite build config
playwright.config.ts      # E2E tests config (build + preview + test)
```

### 1.2 Development workflow

- Install and run dev server:

```bash
npm install
npm run dev
```

- Production build and preview:

```bash
npm run build
npm run preview
```

- E2E tests (Playwright automatically builds and starts a preview server):

```bash
npm run test:e2e
```

---

## 2) Vite and environment configuration

This app is built with Vite. Runtime configuration is provided via Vite “import.meta.env.*” variables and centralized in `src/config.js`.

Key env files:
- `.env.development` — used during `npm run dev`
- `.env.test` — used by Playwright test runs (build+preview under test mode)
- `.env.example` — template you can copy from

Important env keys:
- `VITE_API_MODE`: one of `local | backend-test | backend-prod`
- `VITE_API_BASE`: optional base URL fallback (used if specific PROD/TEST not set)
- `VITE_API_BASE_PROD`: backend base for production mode
- `VITE_API_BASE_TEST`: backend base for test mode

Central config module:
- `src/config.js` reads these envs and exports:
  - `ENV_DEFAULT_MODE`
  - `API_BASE_FALLBACK`, `API_BASE_PROD`, `API_BASE_TEST`
  - `IS_DEV`

The API client (`src/api.js`) imports from `src/config.js` so hostnames and modes are not hardcoded in code. In dev, legacy “backend” modes resolve to same-origin to leverage Vite’s dev server proxy if needed.

---

## 3) React for Vue developers

If you’re used to Vue (Options or Composition API), here’s the React mapping you’ll use most:

- Templates vs JSX
  - Vue SFCs have `<template>`; React uses JSX in `.jsx` files, which is JavaScript syntax that compiles to `React.createElement` calls. You embed expressions inside `{ ... }`.

- Reactive state
  - Vue’s `ref`, `reactive`, and computed are analogous to React’s `useState`, `useMemo`, and `useRef`.
  - React state updates are batched and asynchronous; never mutate state directly—always use setters returned by `useState`.

- Lifecycle
  - Vue’s `mounted`, `watch`, `onUnmounted` map to `useEffect` in React.
  - `useEffect(() => { ...; return () => cleanup }, [deps])` runs on mount and when `deps` change; cleanup runs on unmount or before next effect.

- Props / emits
  - Vue: props and `emit('event')`.
  - React: props and function callbacks `onSave={...}` passed down to children.

- Conditional rendering and lists
  - Vue: `v-if`, `v-for`.
  - React: `{cond && <Component/>}` and `{list.map(item => <li key={id}>{...}</li>)}`.

- Controlled inputs
  - Vue: `v-model` sugar.
  - React: pass `value` and `onChange` to inputs, often via UI libraries (like Ant Design Form).

- Global state
  - Vuex/Pinia equivalent could be React Context, Redux, Zustand, etc. This project keeps things local/prop-driven and focuses on API-driven state.

- Components
  - React components are functions that return JSX. Hooks (like `useState`, `useEffect`) must be called at the top level of the component function.

Useful resources: React docs (beta) “Thinking in React”, and “From Vue to React” migration articles.

---

## 4) UI layer: Tailwind CSS + Ant Design

We combine utility-first styling (Tailwind) with a robust component library (Ant Design v5).

- Tailwind CSS
  - Config: `tailwind.config.js`
  - Entry: `src/styles.css` includes Tailwind base, components, utilities.
  - Usage: add classes directly in JSX: `<div className="flex items-center gap-2">...`.
  - Customize tokens and safelist in `tailwind.config.js` if dynamic classnames are used.

- Ant Design (antd)
  - Common components here: `Button`, `Form`, `Input`, `Select`, `DatePicker`, `Drawer`, `Table`, `Upload`, `Popconfirm`, `Tag`, `Grid`.
  - Form handling:
    - `Form` manages fields and validation; you can call `form.validateFields()` then submit to backend.
    - This project uses minimal client validation and defers to backend where possible.
  - Layout and responsiveness:
    - `Grid.useBreakpoint()` (as in `ProjectDrawer.jsx`) helps detect mobile layout.

When to use what:
- Use Ant Design for higher-level components, interactions, and forms.
- Use Tailwind for layout, spacing, colors, and quick adjustments.

---

## 5) Calendar integration (FullCalendar)

- Library: `@fullcalendar/react` with day grid and interaction plugins.
- Component: see `src/components/CalendarView.jsx` for usage patterns such as event rendering and click handlers.
- Tips:
  - Keep events in state and pass as props to FullCalendar.
  - Use memoization (`useMemo`) if computing large event lists.
  - Pay attention to date formats (this repo uses YYYY-MM-DD strings consistently).

---

## 6) Internationalization (i18n)

- Stack: `i18next` + `react-i18next`.
- Initialization: `src/i18n/index.js` loads locales and sets default `zh-CN`. Language preference is persisted under `rw_lang` in localStorage.
- Dictionaries live in `src/locales/*.json`.
- Usage in components:
  - `const { t } = useTranslation()`
  - `t('btn.addProject')`
- Adding translations:
  1) Add a key to all locale files under the same path: `src/locales/en.json`, `zh-CN.json`, `zh-TW.json`.
  2) Use that key via `t('your.key')` in JSX.
- Common pitfall: if you see raw `your.key` in UI, a translation is missing in the current locale file. Add it there.

---

## 7) API layer and runtime modes

The API client in `src/api.js` supports:
- `backend-prod` / `backend-test`: real HTTP calls to configured hosts
- `local`: in-browser localStorage model (no network) used by tests or offline dev

Centralization:
- Hosts and default mode are read from `src/config.js`, which pulls from envs.
- No hostnames are hardcoded in `src/api.js`.

Key exports (selected):
- Listing and CRUD
  - `listProjects({ q?, status?, start?, end?, includeArchived?, page?, pageSize? })`
  - `getProject(id)`
  - `createProject(values)`
  - `updateProject(id, values)`
  - `archiveProject(id, archived = true)`
  - `deleteProject(id)`
- Photos and exports
  - `uploadPhoto(id, file)`
  - `listProjectPhotos(id)`
  - `deleteProjectPhoto(id, photoIdOrToken)`
  - `deleteAllProjectPhotos(id)`
  - `exportExcel({ start, end, archived, includeArchived })`
  - `exportPDF({ start, end, archived, includeArchived })`

Data mapping:
- The UI uses snake_case internally for project fields (e.g., `project_code`, `client_name`).
- When talking to backend, the API layer sends both snake_case and camelCase to maximize compatibility (see `mapToBackendWithBothKeys`).

Local mode behavior:
- All CRUD happens in localStorage under key `rw_projects`.
- Photo upload is simulated by file-to-DataURL.

File downloads:
- Excel/PDF export endpoints respond with blobs; the client triggers a download with the server-provided filename when available.

---

## 8) Environment-driven base URLs (how to point to your backend)

Set these in `env.*` files instead of editing JS code:
- `VITE_API_MODE=backend-prod` to use the production backend
- `VITE_API_MODE=backend-test` to use the test backend
- `VITE_API_MODE=local` for localStorage mode (tests use this by default)
- `VITE_API_BASE_PROD=http://192.168.1.120:9005` (or your deployed URL)
- `VITE_API_BASE_TEST=http://localhost:9005` (or another test server)

The app reads them through `src/config.js`. Changing envs does not require code modifications.

---

## 9) Testing with Playwright (E2E)

- Config: `playwright.config.ts` builds the app in test mode and runs a preview server on `http://localhost:4173`.
- Tests: `tests/*.spec.ts`.
  - Patterns used in this repo:
    - Force runtime API mode via `page.addInitScript(() => localStorage.setItem('rw_api_mode','backend-test'))`.
    - Intercept backend calls with `page.route('**://localhost:9005/...')` and stub JSON or binary responses.
    - Interact with UI using roles and labels for resilient selectors.

Run tests:
```bash
npm run test:e2e
# Or with UI test runner:
npm run test:e2e:ui
```

---

## 10) Common tasks (recipes)

### 10.1 Add a new i18n label
1) Add keys in `src/locales/en.json`, `zh-CN.json`, `zh-TW.json` under a consistent namespace (e.g., `btn.*`, `field.*`).
2) Use in component: `const { t } = useTranslation(); <Button>{t('btn.newAction')}</Button>`.
3) Verify in the UI; if a key shows up, it’s missing in the current locale file.

### 10.2 Add a new project field to the drawer
1) Update API mapping if the field is persisted:
   - Add to `mapToFrontend` and `mapToBackend` in `src/api.js` (snake_case preferred internally).
2) Update `ProjectDrawer.jsx` Form:
   - Add `Form.Item name="your_field" label={t('field.yourField')}` with an appropriate `Input`.
3) Add translation keys under `field.yourField` in locale files.
4) Update tests if they validate this field.

### 10.3 Add a new API endpoint
1) Implement a function in `src/api.js` using the shared axios instance:
   - Example: `await http.get('/api/new-endpoint', { params: { ... } })`.
2) Export it as a named function and call from your component.
3) If needed for tests, stub the route in Playwright with `page.route(...)`.

### 10.4 Wire a button to call backend and show feedback
1) Add a `Button` (Antd) with a translation label: `<Button onClick={handleClick}>{t('btn.doThing')}</Button>`.
2) In `handleClick`, call your API function; on success, show `message.success(t('toast.saved'))` or similar.
3) Disable the button while loading to avoid duplicate requests.

### 10.5 Extend Calendar events
1) Fetch or compute events in the parent, pass to `CalendarView` as props.
2) Convert data to FullCalendar event objects `{ id, title, start, end, ... }`.
3) Use `eventClick` to open the drawer for that project.

---

## 11) Conventions and tips

- Date handling: use `dayjs` and keep API payload dates as `YYYY-MM-DD` strings.
- Status values are English codes (`not_started | in_progress | completed`) rendered into localized labels via i18n.
- Avoid direct access to `import.meta.env` outside `src/config.js`—import config values instead.
- Keep translations complete across locales to avoid keys showing in UI.
- Prefer Ant Design form controls for consistency and built-in validation.
- Use Tailwind for layout/spacing; don’t over-customize Antd unless necessary.

---

## 12) Troubleshooting

- I see a translation key literal like `btn.deleteAllPhotos` in UI
  - The key is missing in the current locale (e.g., `zh-CN.json`). Add it under the same key in all locale files.

- Backend requests go to the wrong host
  - Check your `.env.*` and confirm `VITE_API_BASE_PROD/TEST` are correct.
  - Ensure the UI runtime mode is set correctly (it persists under `rw_api_mode` in localStorage).

- File downloads have odd filenames
  - Confirm backend sets `Content-Disposition` with `filename` or `filename*=UTF-8''...` per RFC; the client tries to reuse it.

- Playwright tests can’t find Node Buffer types
  - Avoid `import { Buffer } from 'buffer'` in tests; send string bodies or `Uint8Array` instead.

---

## 13) What’s not (yet) included

- A global state manager (Redux/Zustand) — local state and props are sufficient for this app’s scope.
- React Router — the app is single-view with modals/drawers; routing can be added later if needed.
- ESLint/Prettier config — add them if you want stricter linting/formatting.

---

## 14) Appendix: Quick mental model (Vue → React)

| Concept                | Vue (3)                                | React (18)                         |
|------------------------|----------------------------------------|------------------------------------|
| View layer             | Templates (`<template>`)               | JSX in `.jsx`                      |
| Component state        | `ref`, `reactive`, `computed`          | `useState`, `useMemo`, `useRef`    |
| Lifecycle              | `onMounted`, `watch`, `onUnmounted`    | `useEffect`                        |
| Parent → child         | Props                                   | Props                              |
| Child → parent         | `emit('x')`                             | Callbacks via props                |
| Conditional rendering  | `v-if`, `v-show`                        | `{cond && <A/>}`                   |
| Lists                  | `v-for`                                 | `{arr.map(...)}` with `key`        |
| Two-way binding        | `v-model`                               | Controlled inputs + `onChange`     |
| Global state           | Vuex/Pinia                              | Context/Redux/Zustand (optional)   |

If you’re comfortable with this mapping, you’ll feel at home in the codebase.

---

## 15) Next steps

- Try a small change: add a new translation key and show it in `HeaderBar`.
- Add a field in `ProjectDrawer` and persist it via `updateProject`.
- Write a Playwright test that stubs the new field in backend responses and asserts the UI behavior.

If you’d like, we can grow this guide with more examples (e.g., Antd theming, more FullCalendar customizations, or adding React Router for deep links).

---

## 16) React deeper dive: hooks, patterns, and pitfalls

- State vs derived state
  - Keep the minimal source of truth in `useState`; derive views with `useMemo`.
  - Avoid duplicating the same value in multiple states to prevent inconsistencies.
- `useMemo` and `useCallback`
  - `useMemo(factory, [deps])` memoizes expensive computations.
  - `useCallback(fn, [deps])` memoizes function references to avoid unnecessary renders in children.
  - Don’t overuse; apply when it prevents measurable re-renders or heavy work.
- `useRef`
  - Holds mutable values that don’t trigger renders (e.g., timers, previous values, DOM refs).
- Custom hooks
  - Extract reusable logic into hooks: `useProjectList(filters)`, `useApiMode()`, `useDebounce(value, delay)`.
  - Rules of hooks still apply: call hooks only at the top level.
- Lifting state and prop drilling
  - Lift shared state up to the nearest common parent.
  - If deep drilling becomes cumbersome, consider Context (or a small state library) for cross-cutting state (e.g., app mode, auth user).
- Controlled forms
  - Prefer Antd Form as the source of truth; use `form.setFieldsValue` / `form.getFieldsValue`.
- Concurrency and effects
  - Always declare effect dependencies. ESLint (if enabled) can help; otherwise keep a mental model: every external variable used in the effect belongs in the deps array.

---

## 17) Ant Design advanced usage

- Theming with ConfigProvider
  - Wrap your app (e.g., in `App.jsx`) with `ConfigProvider` to set theme tokens, dark mode, locale.
  - Example (pseudo):
    - `<ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }} locale={zhCN}>...</ConfigProvider>`
- Algorithm/theme
  - Antd v5 uses token-based theming. You can switch to dark algorithm imports to enable dark mode.
- Messaging and notifications
  - Use `App` provider (`App.useApp()`) to access `message`, `notification`, `modal` APIs (this repo uses `App as AntdApp`).
- Forms and validation
  - Rules: `{ required: true, message: t('validation.requiredXxx') }`.
  - Validate on submit with `form.validateFields()`; show backend errors at field-level with `form.setFields([{ name, errors: [msg] }])`.
- Layout and Grid
  - Use `Grid.useBreakpoint()` for responsive branching (as seen in `ProjectDrawer.jsx`).
  - Apply `Space`, `Row/Col` judiciously; Tailwind can complement spacing.
- DatePicker range
  - For reliable E2E testing, directly write to inputs then press Enter (as done in tests).
- Upload
  - `beforeUpload` for client-side checks; send with our `uploadPhoto` API. Show progress using `onProgress`.
- Drawer and Modal UX
  - Keep primary actions visible; disable buttons while loading; handle Escape/overlay interactions gracefully.

---

## 18) Tailwind advanced configuration

- Theme customization
  - Extend colors, spacing, font sizes in `tailwind.config.js` under `theme.extend`.
- Dark mode
  - Strategy: `class`-based dark mode gives explicit control (toggle a `.dark` class on `<html>`).
- Dynamic class names
  - Tailwind only generates classes it sees at build-time. If you construct class names dynamically, safelist them in the config.
- Composition helpers
  - Utilities like `clsx` (optional) can make conditional classes cleaner.
- When to extract CSS
  - If a set of utilities repeats many times, consider extracting a component or adding a small CSS class in `styles.css`.

---

## 19) FullCalendar advanced features

- Plugins and interactions
  - Drag/drop and resize come from `@fullcalendar/interaction`. Add handlers for `eventDrop`, `eventResize` to persist.
- Event rendering
  - Use `eventContent` for custom markup. Keep it lightweight for performance.
- Performance
  - Memoize the events array. For very large datasets, consider server-side filtering by date range.
- Localization and timezones
  - Provide locale data to match the app’s language; ensure date strings are in ISO or FullCalendar-friendly formats.
- Visuals
  - Set `eventColor`/`eventClassNames` based on status; keep a mapping (e.g., completed = green, in_progress = blue).

---

## 20) i18n advanced topics

- Interpolation and plurals
  - Use `t('toast.seedCreated', { count })` to trigger pluralization (ensure locale files define plural forms if needed).
- Namespaces (optional)
  - For large apps, split keys into namespaces and load on demand.
- Formatting
  - For dates/numbers, format in code (dayjs) and feed the string into `t()` when needed.
- Language switching
  - Use `setAppLanguage(lng)` from `src/i18n/index.js`. Persisted under `rw_lang`.
- Key guidelines
  - Prefer stable keys (`btn.create`, `field.projectName`). Keep sentences in `toast.*` or `err.*`.

---

## 21) API and axios patterns (beyond basics)

- Central axios instance
  - Already configured in `src/api.js`. You can add interceptors for auth tokens, 401 handling, or logging if needed.
- Error normalization
  - Wrap API calls to throw consistent errors: `{ code, message, details }` so the UI can present them uniformly.
- Cancellation and timeouts
  - Use `AbortController` (`axios` supports signals) to cancel long-running requests on unmount.
- Retry/backoff (optional)
  - Create a tiny helper that retries idempotent GETs with exponential backoff.
- Upload/download progress
  - Pass `onUploadProgress` / `onDownloadProgress` to show progress bars.
- Pagination and envelopes
  - The client already supports array or `{ items, page, pageSize, total }`. Prefer the envelope for scalable lists.
- Authentication (future)
  - If adding auth, store tokens securely (httpOnly cookies preferred). Attach headers in an interceptor.

---

## 22) Playwright: advanced E2E patterns

- Fixtures and test organization
  - Use `test.describe`/`beforeEach` to set mode and common routes.
- Route stubbing
  - Prefer precise URL patterns (e.g., `**://localhost:9005/api/projects/**`). Return envelopes compatible with the FE.
- Tracing and debugging
  - Use `trace: 'on-first-retry'` (already configured). Run `npm run test:e2e:ui` to debug visually.
- Mobile emulation
  - This repo includes a mobile project (`Pixel 5`). Test key flows under mobile.
- Flakiness
  - Use role/label-based selectors. Wait for network idle or specific UI signals, not raw timeouts.
- CI tips
  - Cache Playwright browsers; ensure servers run on fixed ports with `--strictPort` (already set).

---

## 23) Performance, code-splitting, and UX polish

- Code-splitting
  - Use `React.lazy` and `Suspense` for rarely visited screens. With Vite, dynamic imports are easy.
- Memoization
  - Memoize heavy subtrees; avoid creating new inline objects/functions passed to deep children unless needed.
- Virtualization (optional)
  - For very long tables, consider virtualization libraries to keep DOM small.
- Feedback and skeletons
  - Use `Spin`, skeleton placeholders, and disabled states for loading paths.
- Web vitals (optional)
  - Measure interaction latency if you notice sluggishness; optimize render hotspots.

---

## 24) Accessibility (a11y) and international UX

- Semantics
  - Prefer semantic elements and ARIA roles where appropriate. Antd components include many built-in semantics.
- Keyboard support
  - Ensure dialogs/drawers trap focus; provide Escape to close and visible focus rings.
- Labels
  - Use labeled controls so testing and assistive tech can find elements reliably.
- Contrast and color
  - Keep adequate contrast; don’t rely on color alone to convey status.
- Localization UX
  - Don’t concatenate translated fragments; use interpolation and full sentences when possible.

---

## 25) Deployment and environment management

- Environments
  - Use `.env.development`, `.env.test`, and (optionally) `.env.production` with `VITE_API_BASE_*` keys.
- Injection
  - Vite inlines `import.meta.env.*` at build time; keep secrets out of frontends.
- Hosting
  - Build produces static assets under `dist/`. Serve via a static host or CDN; run a simple preview with `npm run preview`.
- Base path
  - If serving under a sub-path, set `base` in `vite.config.js` accordingly.

---

## 26) Conventions, style, and collaboration

- Naming
  - Components: `PascalCase.jsx`; hooks: `useSomething.js`; translations: kebab or dot paths by domain (e.g., `btn.*`, `field.*`).
- Commits and PRs
  - Keep changeset small and focused; reference issues; include before/after screenshots for UI changes.
- Tests
  - Add/refine Playwright specs for important paths. Use data-testids sparingly; prefer roles/labels.
- Linting/formatting (optional)
  - Add ESLint + Prettier if desired. Enforce via pre-commit hooks for consistent style.

---

## 27) FAQ (extended)

- Why snake_case in the UI model?
  - It aligns with the backend’s original shape and keeps mapping logic explicit. The API layer sends both to maximize compatibility.
- Can we add React Router?
  - Yes; start with minimal routes and code-split large screens.
- How do I change the primary color or enable dark mode?
  - Wrap the app in `ConfigProvider` with theme tokens (and dark algorithm) and update Tailwind colors if needed.
- How do I point to a new backend without code changes?
  - Set `VITE_API_BASE_PROD/TEST` and switch `VITE_API_MODE` via env or runtime (persisted under `rw_api_mode`).

---

## 28) Learning path (from Vue to React + this stack)

1) Build a small component in React using hooks (state, effect).
2) Convert a simple Vue component you know into React with Antd controls.
3) Add a new i18n key and toggle languages.
4) Implement a small API call in `src/api.js` and render results.
5) Write a Playwright spec that stubs an endpoint and validates UI behavior.
6) Explore Ant Design theming; change primary color and test dark mode.
7) Add a calendar feature (custom event content or drag-drop) and wire it to the API.

With these steps, you’ll be productive in this codebase and comfortable with React, Tailwind, Antd, and the surrounding tooling.
