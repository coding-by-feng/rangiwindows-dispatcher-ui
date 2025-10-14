/*
  API module (offline mode)
  ---------------------------------
  This implementation uses browser localStorage only and makes NO network calls.
  It is intended for frontend development before backend APIs are available.

  Data is stored under the localStorage key: 'rw_projects'.
  To reset data, clear site data in your browser devtools or run localStorage.removeItem('rw_projects').

  Switching to a real backend later:
  - Replace these implementations with HTTP calls (axios/fetch) using your API base.
  - Keep function signatures the same: listProjects, getProject, createProject, updateProject, uploadPhoto, exportExcel, exportPDF.
  - Optionally, implement a MODE flag (e.g., import.meta.env.VITE_API_MODE === 'backend') and branch between HTTP and localStorage.
*/

import dayjs from 'dayjs'

// ---------- Local storage store (no backend) ----------
const LS_KEY = 'rw_projects'

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) { return [] }
}
function saveLocal(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list || []))
}
function nextId(list) {
  return (list.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1)
}
function nextCode(list) {
  const n = list.length + 1
  return `P-${String(n).padStart(3, '0')}`
}
function matchQuery(p, q) {
  if (!q) return true
  const s = `${p.project_code || ''} ${p.name || ''} ${p.client_name || ''} ${p.address || ''}`.toLowerCase()
  return s.includes(String(q).toLowerCase())
}
function matchStatus(p, status) {
  if (!status) return true
  return p.status === status
}
function inRange(p, start, end) {
  if (!start && !end) return true
  const ps = p.start_date ? dayjs(p.start_date) : null
  const pe = p.end_date ? dayjs(p.end_date) : null
  const s = start ? dayjs(start) : null
  const e = end ? dayjs(end) : null
  // Overlap check for [ps, pe] with [s, e]
  if (ps && pe && s && e) return ps.isBefore(e.add(1, 'day')) && pe.isAfter(s.subtract(1, 'day'))
  if (ps && pe && s && !e) return pe.isAfter(s.subtract(1, 'day'))
  if (ps && pe && !s && e) return ps.isBefore(e.add(1, 'day'))
  return true
}

// ---------- Public API (local only) ----------
export async function listProjects(params = {}) {
  const list = loadLocal()
  return list
    .filter(p => matchQuery(p, params.q))
    .filter(p => matchStatus(p, params.status))
    .filter(p => inRange(p, params.start, params.end))
}

export async function getProject(id) {
  const list = loadLocal()
  return list.find(p => String(p.id) === String(id))
}

export async function createProject(values) {
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
    created_at: dayjs().toISOString(),
  }
  saveLocal([...list, project])
  return project
}

export async function updateProject(id, values) {
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) throw new Error('Project not found')
  const updated = { ...list[idx], ...values }
  list[idx] = updated
  saveLocal(list)
  return updated
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function uploadPhoto(id, file) {
  const list = loadLocal()
  const idx = list.findIndex(p => String(p.id) === String(id))
  if (idx === -1) throw new Error('Project not found')
  const dataUrl = await fileToDataUrl(file)
  list[idx] = { ...list[idx], photo_url: dataUrl }
  saveLocal(list)
  return list[idx]
}

// ---------- Export helpers (local only) ----------
async function getLocalByRange(start, end) {
  const list = loadLocal().filter(p => inRange(p, start, end))
  return list
}

export async function exportExcel({ start, end }) {
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
  const wb = utils.book_new()
  const ws = utils.json_to_sheet(data)
  utils.book_append_sheet(wb, ws, '当月施工安排')
  writeFile(wb, `施工安排表_${start || ''}_${end || ''}.xlsx`)
}

export async function exportPDF({ start, end }) {
  const rows = await getLocalByRange(start, end)
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setFontSize(12)
  doc.text('当月施工安排', 40, 40)
  autoTable(doc, {
    startY: 60,
    head: [[
      '项目编号', '项目名称', '客户', '地址', '销售', '安装', '开始日期', '结束日期', '状态'
    ]],
    body: rows.map(p => [
      p.project_code,
      p.name,
      p.client_name,
      p.address,
      p.sales_person,
      p.installer,
      p.start_date,
      p.end_date,
      p.status,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [8, 145, 178] },
  })
  doc.save(`施工安排表_${start || ''}_${end || ''}.pdf`)
}
