/*
  API module with backend + local fallback
  ---------------------------------------
  - Backend mode (VITE_API_MODE=backend): uses HTTP calls to your BE at VITE_API_BASE (e.g., http://kiwi-microservice)
  - Local mode (VITE_API_MODE=local): keeps the previous localStorage implementation for offline/dev
*/

import dayjs from 'dayjs'
import axios from 'axios'

export const API_MODE = (import.meta?.env?.VITE_API_MODE || 'local')
export const API_BASE = (import.meta?.env?.VITE_API_BASE || 'http://kiwi-microservice')

// -------------- Axios client (backend mode) --------------
const http = axios.create({ baseURL: API_BASE })

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
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] }
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

// ---------------- Backend implementations ----------------
async function listProjectsBackend(params = {}) {
  try {
    const q = { ...params }
    if (!params?.includeArchived) q.archived = false
    const { data } = await http.get('/api/projects', { params: q })
    return data || []
  } catch (e) {
    console.warn('listProjects error', e)
    return []
  }
}
async function getProjectBackend(id) {
  try { const { data } = await http.get(`/api/projects/${id}`); return data || null } catch { return null }
}
async function createProjectBackend(values) {
  const { data } = await http.post('/api/projects', values)
  return data
}
async function updateProjectBackend(id, values) {
  const { data } = await http.patch(`/api/projects/${id}`, values)
  return data
}
async function archiveProjectBackend(id, archived = true) {
  const { data } = await http.patch(`/api/projects/${id}`, { archived })
  return data
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
async function exportExcelBackend({ start, end }) {
  const name = `施工安排表_${start || ''}_${end || ''}.xlsx`
  await downloadBlob(() => http.get('/api/projects/export/excel', { params: { start, end }, responseType: 'blob' }), name)
}
async function exportPDFBackend({ start, end }) {
  const name = `施工安排表_${start || ''}_${end || ''}.pdf`
  await downloadBlob(() => http.get('/api/projects/export/pdf', { params: { start, end }, responseType: 'blob' }), name)
}

// ---------------- Local implementations (unchanged) ----------------
export async function listProjects(params = {}) {
  if (API_MODE === 'backend') return listProjectsBackend(params)
  const list = loadLocal()
  const includeArchived = !!params?.includeArchived
  return list
    .filter(p => includeArchived ? true : p.archived !== true)
    .filter(p => matchQuery(p, params.q))
    .filter(p => matchStatus(p, params.status))
    .filter(p => inRange(p, params.start, params.end))
}

export async function getProject(id) {
  if (API_MODE === 'backend') return getProjectBackend(id)
  const list = loadLocal()
  return list.find(p => String(p.id) === String(id))
}

export async function createProject(values) {
  if (API_MODE === 'backend') return createProjectBackend(values)
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
    status: values.status || '未开始',
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
  if (API_MODE === 'backend') return updateProjectBackend(id, values)
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) throw new Error('Project not found')
  const updated = { ...list[idx], ...values }
  list[idx] = updated
  saveLocal(list)
  return updated
}

export async function archiveProject(id, archived = true) {
  if (API_MODE === 'backend') return archiveProjectBackend(id, archived)
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) throw new Error('Project not found')
  list[idx] = { ...list[idx], archived: !!archived }
  saveLocal(list)
  return list[idx]
}

export async function deleteProject(id) {
  if (API_MODE === 'backend') return deleteProjectBackend(id)
  const list = loadLocal().filter(p => String(p.id) !== String(id))
  saveLocal(list)
  return true
}

function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) }) }

export async function uploadPhoto(id, file) {
  if (API_MODE === 'backend') return uploadPhotoBackend(id, file)
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) throw new Error('Project not found')
  const dataUrl = await fileToDataUrl(file)
  list[idx] = { ...list[idx], photo_url: dataUrl }
  saveLocal(list)
  return list[idx]
}

async function getLocalByRange(start, end) { return loadLocal().filter(p => inRange(p, start, end)) }

export async function exportExcel({ start, end }) {
  if (API_MODE === 'backend') return exportExcelBackend({ start, end })
  const rows = await getLocalByRange(start, end)
  const { utils, writeFile } = await import('xlsx')
  const data = rows.map(p => ({
    项目编号: p.project_code,
    项目名称: p.name,
    客户: p.client_name,
    地址: p.address,
    销售: p.sales_person,
    安装: p.installer,
    开始日期: p.start_date,
    结束日期: p.end_date,
    状态: p.status,
  }))
  const wb = utils.book_new(); const ws = utils.json_to_sheet(data)
  utils.book_append_sheet(wb, ws, '当月施工安排'); writeFile(wb, `施工安排表_${start || ''}_${end || ''}.xlsx`)
}

export async function exportPDF({ start, end }) {
  if (API_MODE === 'backend') return exportPDFBackend({ start, end })
  // local fallback uses jsPDF/html from previous implementation with CJK support
  const rows = await getLocalByRange(start, end)
  const jsPDF = (await import('jspdf')).default
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  // Build simple HTML table and render to PDF using browser fonts
  const thead = ['项目编号','项目名称','客户','地址','销售','安装','开始日期','结束日期','状态']
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
      <td style="border:1px solid #ccc;padding:6px 8px;">${p.status || ''}</td>
    </tr>`).join('')
  const mount = document.createElement('div')
  mount.innerHTML = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Noto Sans SC', 'Source Han Sans SC', Arial, sans-serif;">
      <h2 style="margin:0 0 8px 0;">当月施工安排</h2>
      <table style="border-collapse:collapse;width:100%;font-size:12px;">${headHtml}${bodyHtml}</table>
    </div>`
  document.body.appendChild(mount)
  await doc.html(mount, { x: 40, y: 40, width: 515, callback: (d) => { d.save(`施工安排表_${start || ''}_${end || ''}.pdf`); document.body.removeChild(mount) } })
}
