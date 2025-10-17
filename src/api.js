/*
  API module with backend + local fallback
  ---------------------------------------
  - Backend mode variants:
    - backend-prod: uses HTTP calls to production BE at VITE_API_BASE_PROD (or VITE_API_BASE)
    - backend-test: uses HTTP calls to test BE at VITE_API_BASE_TEST (or VITE_API_BASE)
  - Local mode (local): keeps the localStorage implementation
  - Runtime mode is persisted in localStorage and can be changed from the UI
*/

import dayjs from 'dayjs'
import axios from 'axios'
import i18n from './i18n'
import { ENV_DEFAULT_MODE, API_BASE_FALLBACK, API_BASE_PROD, API_BASE_TEST, IS_DEV } from './config'

// Env defaults
const ENV_DEFAULT_MODE_LOCAL = ENV_DEFAULT_MODE
const API_BASE_FALLBACK_LOCAL = API_BASE_FALLBACK
const API_BASE_PROD_LOCAL = API_BASE_PROD
const API_BASE_TEST_LOCAL = API_BASE_TEST
const isDev = IS_DEV

// Persisted runtime mode
const LS_MODE_KEY = 'rw_api_mode'
function readMode() {
  try { return localStorage.getItem(LS_MODE_KEY) || ENV_DEFAULT_MODE_LOCAL } catch { return ENV_DEFAULT_MODE_LOCAL }
}
function normalizeMode(m) { return (m === 'backend' || m === 'backend-dev') ? 'backend-test' : m }
let currentMode = normalizeMode(readMode())
try { localStorage.setItem(LS_MODE_KEY, currentMode) } catch {}

function resolveAxiosBase(mode) {
  if (mode === 'local') return ''
  // Keep using dev proxy for legacy 'backend' mode to support local BE via Vite proxy
  if (isDev && (mode === 'backend' || mode === 'backend-dev')) return ''
  if (mode === 'backend-test') return API_BASE_TEST_LOCAL
  if (mode === 'backend-prod' || mode === 'backend') return API_BASE_PROD_LOCAL
  return API_BASE_PROD_LOCAL
}

// Helper/debug utilities
function logBases(context) {
  if (!isDev || typeof window === 'undefined') return
  const resolved = resolveAxiosBase(currentMode) || '(same-origin proxy or local)'
  // eslint-disable-next-line no-console
  console.info(`[API] ${context}: mode=${currentMode}, test=${API_BASE_TEST_LOCAL}, prod=${API_BASE_PROD_LOCAL}, resolved=${resolved}`)
}
export function getApiBases() {
  return { mode: currentMode, test: API_BASE_TEST_LOCAL, prod: API_BASE_PROD_LOCAL, fallback: API_BASE_FALLBACK_LOCAL, resolved: resolveAxiosBase(currentMode) }
}

let http = axios.create({ baseURL: resolveAxiosBase(currentMode) })
logBases('init')
export function getApiMode() { return currentMode }
export function getApiBaseUrl() { return resolveAxiosBase(currentMode) }
export function setApiMode(mode) {
  currentMode = mode
  try { localStorage.setItem(LS_MODE_KEY, mode) } catch {}
  http = axios.create({ baseURL: resolveAxiosBase(mode) })
  logBases('setApiMode')
}

function usingBackend() { return currentMode !== 'local' }

// Utility: safe parse filename from Content-Disposition
function filenameFromHeaders(headers, fallback) {
  const cd = headers && (headers['content-disposition'] || headers['Content-Disposition'])
  if (cd) {
    const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
    const name = decodeURIComponent(m?.[1] || m?.[2] || '')
    if (name) return name
  }
  return fallback
}

async function downloadBlob(getter, fallbackName) {
  const res = await getter()
  const blob = new Blob([res.data])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filenameFromHeaders(res.headers, fallbackName)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ---------------- Local storage store (local mode) ----------------
const LS_KEY = 'rw_projects'
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}
function saveLocal(list) { localStorage.setItem(LS_KEY, JSON.stringify(list || [])) }
function nextId(list) { return (list.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1) }
function nextCode(list) { const n = list.length + 1; return `P-${String(n).padStart(3, '0')}` }
function matchQuery(p, q) {
  if (!q) return true
  const s = `${p.project_code || ''} ${p.name || ''} ${p.client_name || ''} ${p.address || ''}`.toLowerCase()
  return s.includes(String(q).toLowerCase())
}
function matchStatus(p, status) { if (!status) return true; return p.status === status }
function inRange(p, start, end) {
  if (!start && !end) return true
  const ps = p.start_date ? dayjs(p.start_date) : null
  const pe = p.end_date ? dayjs(p.end_date) : null
  const s = start ? dayjs(start) : null
  const e = end ? dayjs(end) : null
  if (ps && pe && s && e) return ps.isBefore(e.add(1, 'day')) && pe.isAfter(s.subtract(1, 'day'))
  if (ps && pe && s && !e) return pe.isAfter(s.subtract(1, 'day'))
  if (ps && pe && !s && e) return ps.isBefore(e.add(1, 'day'))
  return true
}

function normalizeStatusCode(s) {
  if (!s) return s
  if (s === '未开始' || s === 'not_started') return 'not_started'
  if (s === '施工中' || s === 'in_progress') return 'in_progress'
  if (s === '完成' || s === 'completed') return 'completed'
  return s
}

// Map backend <-> frontend field names to keep UI stable (snake_case internally)
function toIsoFromCreatedAt(raw) {
  if (Array.isArray(raw)) {
    const [y, m = 1, d = 1, H = 0, M = 0, S = 0] = raw
    const dt = dayjs(new Date(y, Math.max(0, (m - 1)), d, H, M, S))
    return dt.isValid() ? dt.toISOString() : undefined
  }
  if (typeof raw === 'string') return raw
  return undefined
}
function mapToFrontend(p = {}) {
  // Prefer snake_case if present, otherwise fall back to camelCase from BE
  const pick = (snake, camel) => (p[snake] !== undefined ? p[snake] : p[camel])
  return {
    id: p.id,
    project_code: pick('project_code', 'projectCode'),
    name: p.name,
    client_name: pick('client_name', 'clientName'),
    client_phone: pick('client_phone', 'clientPhone'),
    address: p.address,
    sales_person: pick('sales_person', 'salesPerson'),
    installer: p.installer,
    team_members: pick('team_members', 'teamMembers'),
    start_date: pick('start_date', 'startDate'),
    end_date: pick('end_date', 'endDate'),
    status: normalizeStatusCode(p.status),
    today_task: pick('today_task', 'todayTask'),
    progress_note: pick('progress_note', 'progressNote'),
    // photo_url removed in BE; keep for local mode fallback only
    photo_url: pick('photo_url', 'photoUrl'),
    archived: p.archived,
    created_at: p.created_at !== undefined ? p.created_at : toIsoFromCreatedAt(p.createdAt),
  }
}
function mapToBackend(values = {}) {
  // Convert our snake_case values to camelCase for backend
  const out = {
    id: values.id,
    projectCode: values.project_code,
    name: values.name,
    clientName: values.client_name,
    clientPhone: values.client_phone,
    address: values.address,
    salesPerson: values.sales_person,
    installer: values.installer,
    teamMembers: values.team_members,
    startDate: values.start_date,
    endDate: values.end_date,
    status: values.status,
    todayTask: values.today_task,
    progressNote: values.progress_note,
    // photoUrl removed in new BE spec
    archived: values.archived,
  }
  // Remove undefined keys to keep payload clean
  Object.keys(out).forEach(k => out[k] === undefined && delete out[k])
  return out
}
function mapToBackendWithBothKeys(values = {}) {
  // Include both snake_case (original) and camelCase keys for maximum compatibility
  const camel = mapToBackend(values)
  return { ...values, ...camel }
}

// ---------------- Backend implementations ----------------
async function listProjectsBackend(params = {}) {
  const q = { ...params }
  if (!params?.includeArchived) q.archived = false
  const { data } = await http.get('/api/projects', { params: q })
  // New BE returns envelope { items, page, pageSize, total }
  let items = []
  let page = Number(params.page) || 1
  let pageSize = Number(params.pageSize) || 10
  let total = 0
  if (Array.isArray(data)) {
    items = data
    total = data.length
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.items)) items = data.items
    else if (Array.isArray(data.list)) items = data.list
    else if (Array.isArray(data.results)) items = data.results
    else if (Array.isArray(data.data)) items = data.data
    page = Number(data.page) || page
    pageSize = Number(data.pageSize) || pageSize
    total = Number(data.total) || (Array.isArray(items) ? items.length : 0)
  }
  return { items: items.map(p => mapToFrontend(p)), page, pageSize, total }
}
async function getProjectBackend(id) {
  const { data } = await http.get(`/api/projects/${id}`)
  if (!data) throw new Error('Project not found')
  return mapToFrontend(data)
}
async function createProjectBackend(values) {
  const payload = mapToBackendWithBothKeys(values)
  const { data } = await http.post('/api/projects', payload)
  return mapToFrontend(data)
}
async function updateProjectBackend(id, values) {
  const payload = mapToBackendWithBothKeys(values)
  const { data } = await http.patch(`/api/projects/${id}`, payload)
  return mapToFrontend(data)
}
async function archiveProjectBackend(id, archived = true) {
  // Keep PATCH for compatibility; BE also supports POST /archive
  const { data } = await http.patch(`/api/projects/${id}`, { archived })
  return mapToFrontend(data)
}
async function deleteProjectBackend(id) {
  await http.delete(`/api/projects/${id}`)
  return true
}
async function uploadPhotoBackend(id, file) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await http.post(`/api/projects/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data
}
async function listProjectPhotosBackend(id) {
  const { data } = await http.get(`/api/projects/${id}/photos`)
  return Array.isArray(data) ? data : []
}
async function deleteProjectPhotoBackend(id, photoId) {
  await http.delete(`/api/projects/${id}/photos/${photoId}`)
  return true
}
async function deleteProjectPhotoByTokenBackend(id, token) {
  await http.delete(`/api/projects/${id}/photo/${token}`)
  return true
}
async function deleteAllProjectPhotosBackend(id) {
  await http.delete(`/api/projects/${id}/photos`)
  return true
}
async function exportExcelBackend({ start, end, archived, includeArchived }) {
  const name = `施工安排表_${start || ''}_${end || ''}.xlsx`
  await downloadBlob(() => http.get('/api/export/excel', { params: { start, end, archived, includeArchived }, responseType: 'blob' }), name)
}
async function exportPDFBackend({ start, end, archived, includeArchived }) {
  const name = `施工安排表_${start || ''}_${end || ''}.pdf`
  await downloadBlob(() => http.get('/api/export/pdf', { params: { start, end, archived, includeArchived }, responseType: 'blob' }), name)
}

// ---------------- Public API (switches by runtime mode) ----------------
export async function listProjects(params = {}) {
  if (usingBackend()) return listProjectsBackend(params)
  const list = loadLocal()
  const includeArchived = !!params?.includeArchived
  const archivedFlag = params?.archived
  const filtered = list
    // includeArchived=true => only archived
    .filter(p => includeArchived ? p.archived === true : (archivedFlag === true ? p.archived === true : p.archived !== true))
    .filter(p => matchQuery(p, params.q))
    .filter(p => matchStatus(p, params.status))
    .filter(p => inRange(p, params.start, params.end))
  const page = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || 10
  const total = filtered.length
  const startIdx = (page - 1) * pageSize
  const items = filtered.slice(startIdx, startIdx + pageSize)
  return { items, page, pageSize, total }
}

export async function getProject(id) {
  if (usingBackend()) return getProjectBackend(id)
  const list = loadLocal()
  return list.find(p => String(p.id) === String(id))
}

export async function createProject(values) {
  if (usingBackend()) return createProjectBackend(values)
  const list = loadLocal()
  const id = nextId(list)
  const project = {
    id,
    project_code: nextCode(list),
    name: values.name,
    client_name: values.client_name,
    client_phone: values.client_phone,
    address: values.address,
    sales_person: values.sales_person,
    installer: values.installer,
    team_members: values.team_members,
    start_date: values.start_date,
    end_date: values.end_date,
    status: values.status || 'not_started',
    today_task: values.today_task || '',
    progress_note: values.progress_note || '',
    photo_url: '',
    archived: false,
    created_at: dayjs().toISOString(),
  }
  saveLocal([...list, project])
  return project
}

export async function updateProject(id, values) {
  if (usingBackend()) return updateProjectBackend(id, values)
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) throw new Error('Project not found')
  const updated = { ...list[idx], ...values }
  list[idx] = updated
  saveLocal(list)
  return updated
}

export async function archiveProject(id, archived = true) {
  if (usingBackend()) return archiveProjectBackend(id, archived)
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) throw new Error('Project not found')
  list[idx] = { ...list[idx], archived: !!archived }
  saveLocal(list)
  return list[idx]
}

export async function deleteProject(id) {
  if (usingBackend()) return deleteProjectBackend(id)
  const list = loadLocal().filter(p => String(p.id) !== String(id))
  saveLocal(list)
  return true
}

function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) }) }

export async function uploadPhoto(id, file) {
  if (usingBackend()) return uploadPhotoBackend(id, file)
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) throw new Error('Project not found')
  const dataUrl = await fileToDataUrl(file)
  list[idx] = { ...list[idx], photo_url: dataUrl }
  saveLocal(list)
  return list[idx]
}

export async function listProjectPhotos(id) {
  if (usingBackend()) return listProjectPhotosBackend(id)
  // Local fallback: synthesize from photo_url if present
  const p = await getProject(id)
  if (p?.photo_url) {
    return [{ id: 'local-1', projectId: String(id), dfsFileId: 'local/photo', token: 'local', contentType: 'image/jpeg', size: 0, sortOrder: 0, caption: '', createdAt: p.created_at }]
  }
  return []
}

export async function deleteProjectPhoto(id, ref) {
  if (usingBackend()) {
    // Support both id and token: if ref is a string like 'token:<token>', use new endpoint
    if (typeof ref === 'string' && ref.startsWith('token:')) {
      const token = ref.slice('token:'.length)
      return deleteProjectPhotoByTokenBackend(id, token)
    }
    // Otherwise assume it's photoId
    return deleteProjectPhotoBackend(id, ref)
  }
  // Local: clear photo_url
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) return false
  list[idx] = { ...list[idx], photo_url: '' }
  saveLocal(list)
  return true
}

export async function deleteProjectPhotoByToken(id, token) {
  if (usingBackend()) return deleteProjectPhotoByTokenBackend(id, token)
  // Local fallback same as delete by id: clear single photo
  return deleteProjectPhoto(id, 'local-1')
}

export async function deleteAllProjectPhotos(id) {
  if (usingBackend()) return deleteAllProjectPhotosBackend(id)
  // Local: clear photo_url
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) return false
  list[idx] = { ...list[idx], photo_url: '' }
  saveLocal(list)
  return true
}

export function getPhotoDownloadUrl(projectId, token) {
  const base = getApiBaseUrl() || ''
  return `${base}/api/projects/${projectId}/photo/${token}`
}

async function getLocalByRange(start, end) { return loadLocal().filter(p => inRange(p, start, end)) }

export async function exportExcel({ start, end, archived, includeArchived }) {
  if (usingBackend()) return exportExcelBackend({ start, end, archived, includeArchived })
  const rows = await getLocalByRange(start, end)
  const { utils, writeFile } = await import('xlsx')
  const data = rows.map(p => ({
    [i18n.t('field.projectCode')]: p.project_code,
    [i18n.t('field.projectName')]: p.name,
    [i18n.t('field.client')]: p.client_name,
    [i18n.t('field.address')]: p.address,
    [i18n.t('field.salesPerson')]: p.sales_person,
    [i18n.t('field.installer')]: p.installer,
    [i18n.t('field.startDate')]: p.start_date,
    [i18n.t('field.endDate')]: p.end_date,
    [i18n.t('field.status')]: i18n.t(`status.${p.status}`),
  }))
  const wb = utils.book_new(); const ws = utils.json_to_sheet(data)
  utils.book_append_sheet(wb, ws, i18n.t('excel.sheet'))
  writeFile(wb, i18n.t('excel.filename', { start: start || '', end: end || '' }))
}

export async function exportPDF({ start, end, archived, includeArchived }) {
  if (usingBackend()) return exportPDFBackend({ start, end, archived, includeArchived })
  // local fallback uses jsPDF/html from previous implementation with CJK support
  const rows = await getLocalByRange(start, end)
  const jsPDF = (await import('jspdf')).default
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  // Build simple HTML table and render to PDF using browser fonts
  const thead = [i18n.t('field.projectCode'), i18n.t('field.projectName'), i18n.t('field.client'), i18n.t('field.address'), i18n.t('field.salesPerson'), i18n.t('field.installer'), i18n.t('field.startDate'), i18n.t('field.endDate'), i18n.t('field.status')]
  const headHtml = `<tr>${thead.map(h => `<th style="border:1px solid #ccc;padding:6px 8px;background:#e6f7ff;">${h}</th>`).join('')}</tr>`
  const bodyHtml = rows.map(p => `
    <tr>
      <td style="border:1px solid #ccc;padding:6px 8px;">${p.project_code || ''}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${p.name || ''}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${p.client_name || ''}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${p.address || ''}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${p.sales_person || ''}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${p.installer || ''}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${p.start_date || ''}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${p.end_date || ''}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${i18n.t(`status.${p.status}`)}</td>
    </tr>`).join('')
  const mount = document.createElement('div')
  mount.innerHTML = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Noto Sans SC', 'Source Han Sans SC', Arial, sans-serif;">
      <h2 style="margin:0 0 8px 0;">${i18n.t('pdf.title')}</h2>
      <table style="border-collapse:collapse;width:100%;font-size:12px;">${headHtml}${bodyHtml}</table>
    </div>`
  document.body.appendChild(mount)
  await doc.html(mount, { x: 40, y: 40, width: 515, callback: (d) => { d.save(i18n.t('pdf.filename', { start: start || '', end: end || '' })); document.body.removeChild(mount) } })
}

// Seed at least N Auckland demo projects in local mode; returns created count
export async function seedAucklandDemos(min = 10) {
  if (usingBackend()) return 0
  const list = loadLocal()

  // Count projects whose address mentions Auckland
  const isAkl = (p) => /\bauckland\b/i.test(p?.address || '')
  let aklCount = list.filter(isAkl).length

  const suburbs = [
    'Ponsonby', 'Mount Eden', 'Newmarket', 'Albany', 'Takapuna',
    'Manukau', 'Howick', 'Henderson', 'Parnell', 'Onehunga', 'Epsom',
    'Sandringham', 'Remuera', 'Sylvia Park', 'Botany Downs'
  ]
  const streets = ['Queen', 'King', 'Victoria', 'Khyber Pass', 'Dominion', 'Great North', 'Manukau', 'Lake', 'Customs', 'Karangahape']
  const clients = ['Liam', 'Noah', 'Olivia', 'Emma', 'Ava', 'William', 'James', 'Lucas', 'Mia', 'Isabella']
  const sales = ['Amy', 'Ben', 'Chris', 'Dylan', 'Ethan']
  const installers = ['Peter', 'Jack', 'Liam', 'Noah', 'Oliver']
  const statuses = ['not_started', 'in_progress', 'completed']

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }
  function randInt(minVal, maxVal) { return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal }

  let created = 0
  while (aklCount < min) {
    const today = dayjs()
    const start = today.startOf('month').add(randInt(0, 25), 'day')
    const end = start.add(randInt(0, 3), 'day')
    const suburb = rand(suburbs)
    const street = rand(streets)
    const houseNo = randInt(1, 199)

    const id = nextId(list)
    const project = {
      id,
      project_code: nextCode(list),
      name: `Auckland Window Installation - ${suburb}`,
      client_name: rand(clients),
      client_phone: `021-${randInt(1000000, 9999999)}`,
      address: `${houseNo} ${street} St, ${suburb}, Auckland, NZ`,
      sales_person: rand(sales),
      installer: rand(installers),
      team_members: `${rand(installers)}, ${rand(installers)}`,
      start_date: start.format('YYYY-MM-DD'),
      end_date: end.format('YYYY-MM-DD'),
      status: rand(statuses),
      today_task: '',
      progress_note: '',
      photo_url: '',
      archived: false,
      created_at: dayjs().toISOString(),
    }

    list.push(project)
    aklCount += 1
    created += 1
  }

  saveLocal(list)
  return created
}
