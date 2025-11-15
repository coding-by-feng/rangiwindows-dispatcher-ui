import React from 'react'
import { ConfigProvider, App as AntdApp, Tour } from 'antd'
import dayjs from 'dayjs'
import HeaderBar from './components/HeaderBar'
import CalendarView from './components/CalendarView'
import ProjectTable from './components/ProjectTable'
import ProjectDrawer from './components/ProjectDrawer'
import CreateProjectModal from './components/CreateProjectModal'
import { listProjects, createProject, updateProject, uploadPhoto, exportExcel, getProject, archiveProject, deleteProject, getApiMode, setApiMode, seedAucklandDemos, listProjectPhotos, deleteProjectPhoto, deleteAllProjectPhotos } from './api'
import { useTranslation } from 'react-i18next'
import { setAppLanguage, getAppLanguage } from './i18n'
import zhCN from 'antd/es/locale/zh_CN'
import enUS from 'antd/es/locale/en_US'
import zhTW from 'antd/es/locale/zh_TW'
import { compressImageWithProgress, compressVideoWithProgress } from './utils/compress'

function AppContent() {
  const { message } = AntdApp.useApp()
  const { t } = useTranslation()
  const [lang, setLang] = React.useState(() => getAppLanguage())
  const [projects, setProjects] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState(null)
  const [selectedProject, setSelectedProject] = React.useState(null)
  const [selectedPhotos, setSelectedPhotos] = React.useState([])
  const [createOpen, setCreateOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [status, setStatus] = React.useState()
  const [includeArchived, setIncludeArchived] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [createLoading, setCreateLoading] = React.useState(false)
  const [saveLoading, setSaveLoading] = React.useState(false)
  const [archiveLoading, setArchiveLoading] = React.useState(false)
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [uploadLoading, setUploadLoading] = React.useState(false)
  const [exportExcelLoading, setExportExcelLoading] = React.useState(false)
  const [tourOpen, setTourOpen] = React.useState(false)
  const [projectLoading, setProjectLoading] = React.useState(false)
  const [seedLoading, setSeedLoading] = React.useState(false)
  const [location, setLocation] = React.useState('auckland')
  const [weatherTypes, setWeatherTypes] = React.useState(['prob','rain'])
  const [uploadTasks, setUploadTasks] = React.useState([])

  // Normalize legacy modes to show in UI as backend-test
  const toDisplayMode = React.useCallback((m) => (m === 'backend' || m === 'backend-dev') ? 'backend-test' : m, [])
  const [mode, setMode] = React.useState(() => toDisplayMode(getApiMode?.() || 'local'))
  const [modeReady, setModeReady] = React.useState(false)

  // Ensure runtime mode honors any value pre-set in localStorage (e.g., by Playwright addInitScript)
  React.useLayoutEffect(() => {
    try {
      const m = localStorage.getItem('rw_api_mode')
      if (m) {
        setApiMode?.(m)
        setMode(toDisplayMode(m))
      }
    } catch {}
    setModeReady(true)
    // Kick off an immediate fetch once mode is applied
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => { try { await fetchData() } catch {} })()
  }, [toDisplayMode])

  const fetchData = async (params = {}) => {
    setLoading(true)
    try {
      const resp = await listProjects({ q, status, includeArchived, page, pageSize, ...params })
      // Support both new envelope and legacy array
      const items = Array.isArray(resp) ? resp : Array.isArray(resp?.items) ? resp.items : []
      setProjects(items)
      if (!Array.isArray(resp)) {
        setPage(Number(resp.page) || 1)
        setPageSize(Number(resp.pageSize) || 10)
        setTotal(Number(resp.total) || items.length)
      } else {
        setTotal(resp.length)
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.error(t('err.loadFailed', { msg }))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { fetchData() }, [])
  React.useEffect(() => { if (modeReady) fetchData() }, [modeReady, q, status, includeArchived, page, pageSize])

  // Reset page to 1 on filter changes
  React.useEffect(() => { setPage(1) }, [q, status, includeArchived])

  const onExport = (type) => {
    if (type !== 'excel') return // Only allow Excel export now
    const start = dayjs().startOf('month').format('YYYY-MM-DD')
    const end = dayjs().endOf('month').format('YYYY-MM-DD')
    const key = `export-${type}`
    setExportExcelLoading(true)
    message.open({ type: 'loading', content: t('loading.exporting'), key })
    exportExcel({ start, end, includeArchived })
      .then(() => {
        message.open({ type: 'success', content: t('btn.exportExcel') + ' OK', key, duration: 2 })
      })
      .catch((e) => {
        const msg = e?.response?.data?.message || e?.message || 'Request failed'
        message.open({ type: 'error', content: t('err.exportFailed', { msg }), key, duration: 3 })
      })
      .finally(() => {
        setExportExcelLoading(false)
      })
  }

  const onPageChange = (p, ps) => {
    setPage(p)
    if (ps && ps !== pageSize) setPageSize(ps)
  }

  const onOpenProject = async (id) => {
    setSelectedId(id)
    setSelectedProject(null)
    setSelectedPhotos([])
    setProjectLoading(true)
    const key = 'loading-project'
    message.open({ type: 'loading', content: t('loading.fetching'), key })
    try {
      const p = await getProject(id)
      console.log('Fetched project:', p)
      setSelectedProject(p)
      try {
        const photos = await listProjectPhotos(id)
        setSelectedPhotos(Array.isArray(photos) ? photos : [])
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Request failed'
        message.error(t('err.fetchPhotosFailed', { msg }))
        setSelectedPhotos([])
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.error(t('err.fetchProjectFailed', { msg }))
      // Auto-close drawer if failed
      setSelectedId(null)
    } finally {
      setProjectLoading(false)
      message.destroy(key)
    }
  }

  const onSaveProject = async (values) => {
    if (!selectedId) return
    const key = 'saving'
    setSaveLoading(true)
    message.open({ type: 'loading', content: t('loading.saving'), key })
    try {
      const updated = await updateProject(selectedId, values)
      setSelectedProject(updated)
      message.open({ type: 'success', content: t('toast.saved'), key, duration: 2 })
      fetchData()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.open({ type: 'error', content: t('err.saveFailed', { msg }), key, duration: 3 })
    } finally {
      setSaveLoading(false)
    }
  }

  const onUploadPhoto = async (file) => {
    if (!selectedId) return
    const key = 'uploading'
    // initialize single-task status list with progress fields
    setUploadTasks([{ id: `${Date.now()}-0`, name: file?.name || 'file', size: file?.size || 0, type: file?.type || '', status: 'compressing', attempts: 0, compressPct: 0, uploadPct: 0 }])
    setUploadLoading(true)
    message.open({ type: 'loading', content: t('loading.uploading'), key })
    try {
      // Compress first
      const type = file?.type || ''
      const isImage = type.startsWith('image/')
      const isVideo = type.startsWith('video/')
      const targetImageBytes = 100 * 1024
      const targetVideoBytes = 10 * 1024 * 1024
      const onComp = (pct) => setUploadTasks(prev => prev.map((it, idx) => idx === 0 ? { ...it, compressPct: pct } : it))
      let compressed = file
      if (isImage) compressed = await compressImageWithProgress(file, targetImageBytes, onComp)
      else if (isVideo) compressed = await compressVideoWithProgress(file, targetVideoBytes, onComp)
      // Start upload
      setUploadTasks(prev => prev.map((it, idx) => idx === 0 ? { ...it, status: 'uploading', size: compressed.size } : it))
      await uploadPhoto(selectedId, compressed, { onProgress: (pct) => setUploadTasks(prev => prev.map((it, idx) => idx === 0 ? { ...it, uploadPct: pct } : it)) })
      try {
        const photos = await listProjectPhotos(selectedId)
        setSelectedPhotos(Array.isArray(photos) ? photos : [])
      } catch {}
      setUploadTasks(prev => prev.map((it, idx) => idx === 0 ? { ...it, status: 'success', attempts: Math.max(1, it.attempts || 1), compressPct: 100, uploadPct: 100 } : it))
      message.open({ type: 'success', content: t('toast.photoUploaded'), key, duration: 2 })
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      setUploadTasks(prev => prev.map((it, idx) => idx === 0 ? { ...it, status: 'failed', error: msg, attempts: (it.attempts || 0) + 1 } : it))
      message.open({ type: 'error', content: t('err.uploadFailed', { msg }), key, duration: 3 })
    } finally {
      setUploadLoading(false)
    }
  }

  // New: multi-file sequential upload with up to 3 retries per file
  const onUploadMany = async (files) => {
    if (!selectedId || !Array.isArray(files) || files.length === 0) return
    const key = 'uploading-many'
    setUploadTasks(files.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f?.name || `file-${i+1}` , size: f?.size || 0, type: f?.type || '', status: 'compressing', attempts: 0, compressPct: 0, uploadPct: 0 })))
    setUploadLoading(true)
    message.open({ type: 'loading', content: t('loading.uploading'), key })

    const maxRetries = 3
    const failed = []

    const tryOnce = async (file, idx) => {
      let attempt = 0
      const type = file?.type || ''
      const isImage = type.startsWith('image/')
      const isVideo = type.startsWith('video/')
      const targetImageBytes = 100 * 1024
      const targetVideoBytes = 10 * 1024 * 1024

      const onComp = (pct) => setUploadTasks(prev => prev.map((it, i) => i === idx ? { ...it, compressPct: pct } : it))
      // Compress once per file
      let compressed = file
      try {
        if (isImage) compressed = await compressImageWithProgress(file, targetImageBytes, onComp)
        else if (isVideo) compressed = await compressVideoWithProgress(file, targetVideoBytes, onComp)
      } catch {}

      setUploadTasks(prev => prev.map((it, i) => i === idx ? { ...it, status: 'uploading', size: compressed.size } : it))

      while (attempt < maxRetries) {
        try {
          await uploadPhoto(selectedId, compressed, { onProgress: (pct) => setUploadTasks(prev => prev.map((it, i) => i === idx ? { ...it, uploadPct: pct } : it)) })
          setUploadTasks(prev => prev.map((it, i) => i === idx ? { ...it, status: 'success', attempts: attempt + 1, compressPct: 100, uploadPct: 100 } : it))
          return true
        } catch (e) {
          attempt += 1
          setUploadTasks(prev => prev.map((it, i) => i === idx ? { ...it, status: 'uploading', attempts: attempt } : it))
          if (attempt >= maxRetries) {
            const msg = e?.response?.data?.message || e?.message || 'Upload failed'
            setUploadTasks(prev => prev.map((it, i) => i === idx ? { ...it, status: 'failed', error: msg, attempts: attempt } : it))
            return e
          }
          await new Promise(r => setTimeout(r, 250 * attempt))
        }
      }
      return new Error('unknown')
    }

    for (let i = 0; i < files.length; i++) {
      const res = await tryOnce(files[i], i)
      if (res !== true) failed.push({ file: files[i], error: res })
    }

    try {
      const photos = await listProjectPhotos(selectedId)
      setSelectedPhotos(Array.isArray(photos) ? photos : [])
    } catch {}

    if (failed.length === 0) {
      message.open({ type: 'success', content: t('toast.photoUploaded'), key, duration: 2 })
    } else if (failed.length === files.length) {
      const msg = failed[0]?.error?.response?.data?.message || failed[0]?.error?.message || 'Upload failed'
      message.open({ type: 'error', content: t('err.uploadFailed', { msg }), key, duration: 3 })
    } else {
      const msg = `${failed.length}/${files.length} failed`
      message.open({ type: 'warning', content: t('err.uploadFailed', { msg }), key, duration: 3 })
    }

    setUploadLoading(false)
  }

  const onDeletePhoto = async (photoRef) => {
    if (!selectedId) return
    try {
      await deleteProjectPhoto(selectedId, photoRef)
      const photos = await listProjectPhotos(selectedId)
      setSelectedPhotos(Array.isArray(photos) ? photos : [])
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.error(t('err.deletePhotoFailed', { msg }))
    }
  }

  const onDeleteAllPhotos = async () => {
    if (!selectedId) return
    try {
      await deleteAllProjectPhotos(selectedId)
      const photos = await listProjectPhotos(selectedId)
      setSelectedPhotos(Array.isArray(photos) ? photos : [])
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.error(t('err.deletePhotoFailed', { msg }))
    }
  }

  const onCreate = async (values) => {
    const key = 'creating'
    setCreateLoading(true)
    message.open({ type: 'loading', content: t('loading.creating'), key })
    try {
      const created = await createProject(values)
      setCreateOpen(false)
      message.open({ type: 'success', content: t('toast.created'), key, duration: 2 })
      fetchData()
      onOpenProject(created.id)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.open({ type: 'error', content: t('err.createFailed', { msg }), key, duration: 3 })
    } finally {
      setCreateLoading(false)
    }
  }

  const onArchive = async (archived) => {
    if (!selectedId) return
    const key = 'archiving'
    setArchiveLoading(true)
    message.open({ type: 'loading', content: t('loading.archiving'), key })
    try {
      const updated = await archiveProject(selectedId, archived)
      setSelectedProject(updated)
      message.open({ type: 'success', content: archived ? t('toast.archived') : t('toast.unarchived'), key, duration: 2 })
      if (archived && !includeArchived) {
        setSelectedProject(null)
        setSelectedId(null)
        setSelectedPhotos([])
      }
      fetchData()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.open({ type: 'error', content: t('err.archiveFailed', { msg }), key, duration: 3 })
    } finally {
      setArchiveLoading(false)
    }
  }

  const onDelete = async () => {
    if (!selectedId) return
    const key = 'deleting'
    setDeleteLoading(true)
    message.open({ type: 'loading', content: t('loading.deleting'), key })
    try {
      await deleteProject(selectedId)
      setSelectedProject(null)
      setSelectedId(null)
      setSelectedPhotos([])
      message.open({ type: 'success', content: t('toast.deleted'), key, duration: 2 })
      fetchData()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.open({ type: 'error', content: t('err.deleteFailed', { msg }), key, duration: 3 })
    } finally {
      setDeleteLoading(false)
    }
  }

  const onModeChange = async (m) => {
    setMode(m)
    try {
      setApiMode?.(m)
      // Close drawer because data source may change
      setSelectedProject(null)
      setSelectedId(null)
      setSelectedPhotos([])
      await fetchData()
      message.success(t('toast.modeSwitched'))
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.error(t('err.modeSwitchFailed', { msg }))
    }
  }

  const onSeedDemo = async () => {
    if (mode !== 'local') return
    setSeedLoading(true)
    try {
      const created = await seedAucklandDemos(10)
      await fetchData()
      if (created > 0) message.success(t('toast.seedCreated', { count: created }))
      else message.info(t('toast.seedEnough'))
    } finally {
      setSeedLoading(false)
    }
  }

  const onLangChange = (lng) => {
    setLang(lng)
    setAppLanguage(lng)
  }

  const qs = React.useCallback((selector) => document.querySelector(selector), [])

  // Small DOM helpers for demo automation
  const typeInto = React.useCallback((dataTourId, text) => {
    const el = qs(`[data-tour-id="${dataTourId}"]`)
    if (!el) return
    try {
      el.focus?.()
      // For AntD Input/TextArea
      const setter = Object.getOwnPropertyDescriptor(el.__proto__ || HTMLElement.prototype, 'value')?.set
      if (setter) setter.call(el, text)
      else el.value = text
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    } catch {}
  }, [qs])
  const clickEl = React.useCallback((dataTourId) => {
    const el = qs(`[data-tour-id="${dataTourId}"]`)
    el?.click?.()
  }, [qs])

  // Ensure a project drawer is open for drawer-related steps
  const ensureProjectOpen = React.useCallback(async () => {
    if (!selectedProject) {
      const first = projects?.[0]
      if (first?.id) {
        try { await onOpenProject(first.id) } catch {}
      }
    }
  }, [selectedProject, projects])

  // Build steps with aligned actions for simple demo automation
  const tourSpec = React.useMemo(() => {
    const steps = [
      { title: t('tour.mode.title'), description: t('tour.mode.desc'), target: () => qs('[data-tour-id="mode-select"]'), placement: 'bottom' },
      { title: t('tour.lang.title'), description: t('tour.lang.desc'), target: () => qs('[data-tour-id="lang-select"]'), placement: 'bottom' },
      { title: t('tour.search.title'), description: t('tour.search.desc'), target: () => qs('[data-tour-id="search-input"]'), placement: 'bottom' },
      { title: t('tour.statusFilter.title'), description: t('tour.statusFilter.desc'), target: () => qs('[data-tour-id="status-filter"]'), placement: 'bottom' },
      { title: t('tour.archived.title'), description: t('tour.archived.desc'), target: () => qs('[data-tour-id="archived-toggle"]'), placement: 'bottom' },
      { title: t('tour.exportExcel.title'), description: t('tour.exportExcel.desc'), target: () => qs('[data-tour-id="export-excel"]'), placement: 'bottom' },
      ...(mode === 'local' ? [
        { title: t('tour.seed.title'), description: t('tour.seed.desc'), target: () => qs('[data-tour-id="seed-demo"]') || qs('[data-tour-id="more-toggle"]') },
      ] : []),
      { title: t('tour.more.title'), description: t('tour.more.desc'), target: () => qs('[data-tour-id="more-toggle"]'), placement: 'bottom' },
      { title: t('tour.add.title'), description: t('tour.add.desc'), target: () => qs('[data-tour-id="add-project"]'), placement: 'bottom' },
    ]

    const actions = [
      // mode-select
      async () => {},
      // lang-select: toggle to current language (noop)
      async () => {},
      // search-input: set query text programmatically
      async () => { try { setQ('Auckland') } catch {} },
      // status-filter
      async () => { try { setStatus('in_progress') } catch {} },
      // archived-toggle
      async () => { try { setIncludeArchived(true) } catch {} },
      // export-excel
      async () => { try { onExport('excel') } catch {} },
      // seed-demo (only in local mode)
      ...(mode === 'local' ? [async () => { try { await onSeedDemo() } catch {} }] : []),
      // more-toggle: click to show actions
      async () => { clickEl('more-toggle') },
      // add-project: open modal
      async () => { setCreateOpen(true) },
    ]

    // Create modal field steps: auto open modal and fill some demo text
    const createFieldSteps = [
      { id: 'pff-name', text: 'Demo House - Parnell' },
      { id: 'pff-address', text: '123 Parnell Rd, Auckland' },
      { id: 'pff-client-name', text: 'Alice' },
      { id: 'pff-client-phone', text: '021-1234567' },
      { id: 'pff-sales-person', text: 'Tim' },
      { id: 'pff-installer', text: 'Peter' },
      { id: 'pff-team-members', text: 'Peter, Jack' },
    ]
    createFieldSteps.forEach(({ id, text }) => {
      steps.push({ title: t(`tour.${id.replace('pff-', 'pff.')}.title`), description: t(`tour.${id.replace('pff-', 'pff.')}.desc`), target: () => qs(`[data-tour-id="${id}"]`) })
      actions.push(async () => { setCreateOpen(true); setTimeout(() => typeInto(id, text), 50) })
    })
    // Dates, status, today task, note
    steps.push({ title: t('tour.pff.dates.title'), description: t('tour.pff.dates.desc'), target: () => qs('[data-tour-id="pff-dates"]') })
    actions.push(async () => { setCreateOpen(true); /* leave manual pick to user */ })

    steps.push({ title: t('tour.pff.status.title'), description: t('tour.pff.status.desc'), target: () => qs('[data-tour-id="pff-status"]') })
    actions.push(async () => { setCreateOpen(true) })

    steps.push({ title: t('tour.pff.today.title'), description: t('tour.pff.today.desc'), target: () => qs('[data-tour-id="pff-today-task"]') })
    actions.push(async () => { setCreateOpen(true); setTimeout(() => typeInto('pff-today-task', 'Install window frames'), 50) })

    steps.push({ title: t('tour.pff.note.title'), description: t('tour.pff.note.desc'), target: () => qs('[data-tour-id="pff-progress-note"]') })
    actions.push(async () => { setCreateOpen(true); setTimeout(() => typeInto('pff-progress-note', 'Prep done, starting install.'), 50) })

    steps.push({ title: t('tour.create.ok.title'), description: t('tour.create.ok.desc'), target: () => qs('[data-tour-id="create-ok"]') })
    actions.push(async () => { /* avoid auto-submit to skip validations */ })
    steps.push({ title: t('tour.create.cancel.title'), description: t('tour.create.cancel.desc'), target: () => qs('[data-tour-id="create-cancel"]') })
    actions.push(async () => {})

    // Calendar and table steps
    steps.push({ title: t('tour.calendar.title'), description: t('tour.calendar.desc'), target: () => qs('[data-tour-id="calendar-view"]') })
    actions.push(async () => {})
    steps.push({ title: t('tour.table.title'), description: t('tour.table.desc'), target: () => qs('[data-tour-id="project-table"]') })
    actions.push(async () => {})

    // Drawer quick update and actions
    steps.push({ title: t('tour.drawer.status.title'), description: t('tour.drawer.status.desc'), target: () => qs('[data-tour-id="drawer-status"]') })
    actions.push(async () => { await ensureProjectOpen() })
    steps.push({ title: t('tour.drawer.today.title'), description: t('tour.drawer.today.desc'), target: () => qs('[data-tour-id="drawer-today-task"]') })
    actions.push(async () => { await ensureProjectOpen(); setTimeout(() => typeInto('drawer-today-task', 'Measure frames'), 50) })
    steps.push({ title: t('tour.drawer.note.title'), description: t('tour.drawer.note.desc'), target: () => qs('[data-tour-id="drawer-progress-note"]') })
    actions.push(async () => { await ensureProjectOpen(); setTimeout(() => typeInto('drawer-progress-note', 'All materials on-site.'), 50) })
    steps.push({ title: t('tour.drawer.save.title'), description: t('tour.drawer.save.desc'), target: () => qs('[data-tour-id="drawer-save"]') })
    actions.push(async () => { await ensureProjectOpen() })
    steps.push({ title: t('tour.drawer.edit.title'), description: t('tour.drawer.edit.desc'), target: () => qs('[data-tour-id="drawer-edit"]') })
    actions.push(async () => { await ensureProjectOpen() })
    steps.push({ title: t('tour.drawer.cancelEdit.title'), description: t('tour.drawer.cancelEdit.desc'), target: () => qs('[data-tour-id="drawer-cancel-edit"]') })
    actions.push(async () => { await ensureProjectOpen() })
    steps.push({ title: t('tour.drawer.archive.title'), description: t('tour.drawer.archive.desc'), target: () => qs('[data-tour-id="drawer-archive"]') })
    actions.push(async () => { await ensureProjectOpen() })
    steps.push({ title: t('tour.drawer.delete.title'), description: t('tour.drawer.delete.desc'), target: () => qs('[data-tour-id="drawer-delete"]') })
    actions.push(async () => { await ensureProjectOpen() })
    steps.push({ title: t('tour.drawer.upload.title'), description: t('tour.drawer.upload.desc'), target: () => qs('[data-tour-id="drawer-upload"]') })
    actions.push(async () => { await ensureProjectOpen() })
    steps.push({ title: t('tour.drawer.close.title'), description: t('tour.drawer.close.desc'), target: () => qs('[data-tour-id="drawer-close"]') })
    actions.push(async () => { await ensureProjectOpen() })

    return { steps, actions }
  }, [t, qs, mode, setQ, setStatus, setIncludeArchived])

  // Drive UI and run step automation
  const onTourChange = React.useCallback(async (current) => {
    try { await tourSpec.actions?.[current]?.() } catch {}
  }, [tourSpec])

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar
        onSearch={setQ}
        onAdd={() => setCreateOpen(true)}
        onExportExcel={() => onExport('excel')}
        status={status}
        onStatusChange={setStatus}
        includeArchived={includeArchived}
        onToggleIncludeArchived={setIncludeArchived}
        mode={mode}
        onModeChange={onModeChange}
        onSeedDemo={onSeedDemo}
        lang={lang}
        onLangChange={onLangChange}
        onStartTour={() => setTourOpen(true)}
        exportExcelLoading={exportExcelLoading}
        seedLoading={seedLoading}
        location={location}
        onLocationChange={setLocation}
        weatherTypes={weatherTypes}
        onWeatherTypesChange={setWeatherTypes}
      />

      <> {/* wrapping original return */}
        {/* Calendar and table */}
        <div className="p-3 sm:p-4 space-y-3">
          <div data-tour-id="calendar-view">
            <CalendarView projects={projects} onEventClick={onOpenProject} location={location} weatherTypes={weatherTypes} />
          </div>
          <div className="bg-white rounded border p-3" data-tour-id="project-table">
            <ProjectTable
              projects={projects}
              loading={loading}
              onRowClick={onOpenProject}
              pagination={{ page, pageSize, total, onChange: onPageChange }}
            />
          </div>
        </div>
      </>
      <ProjectDrawer
        open={selectedId != null}
        project={selectedProject}
        photos={selectedPhotos}
        onClose={() => { setSelectedProject(null); setSelectedId(null); setSelectedPhotos([]); setProjectLoading(false); setUploadTasks([]) }}
        onSave={onSaveProject}
        onUpload={onUploadPhoto}
        onUploadMany={onUploadMany}
        onDeletePhoto={onDeletePhoto}
        onDeleteAllPhotos={onDeleteAllPhotos}
        onArchive={onArchive}
        onDelete={onDelete}
        saving={saveLoading}
        archiving={archiveLoading}
        deleting={deleteLoading}
        uploading={uploadLoading}
        uploadTasks={uploadTasks}
        onClearUploadTasks={() => setUploadTasks([])}
        loading={projectLoading}
      />

      <CreateProjectModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={createLoading}
      />

      <Tour open={tourOpen} onClose={() => setTourOpen(false)} steps={tourSpec.steps} mask closable onChange={onTourChange} />
    </div>
  )
}

export default function App() {
  const [locale, setLocale] = React.useState(zhCN)
  // Keep ConfigProvider locale in sync with i18n language
  const { i18n } = useTranslation()
  React.useEffect(() => {
    const lng = i18n.language
    setLocale(lng === 'en' ? enUS : lng === 'zh-TW' ? zhTW : zhCN)
  }, [i18n.language])

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#0891b2' } }} locale={locale}>
      <AntdApp>
        <AppContent />
      </AntdApp>
    </ConfigProvider>
  )
}
