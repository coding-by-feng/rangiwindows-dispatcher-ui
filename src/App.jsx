import React from 'react'
import { ConfigProvider, App as AntdApp, Tour } from 'antd'
import dayjs from 'dayjs'
import HeaderBar from './components/HeaderBar'
import CalendarView from './components/CalendarView'
import ProjectTable from './components/ProjectTable'
import ProjectDrawer from './components/ProjectDrawer'
import CreateProjectModal from './components/CreateProjectModal'
import { listProjects, createProject, updateProject, uploadPhoto, exportExcel, exportPDF, getProject, archiveProject, deleteProject, getApiMode, setApiMode, seedAucklandDemos, listProjectPhotos, deleteProjectPhoto, deleteAllProjectPhotos } from './api'
import { useTranslation } from 'react-i18next'
import { setAppLanguage, getAppLanguage } from './i18n'
import zhCN from 'antd/es/locale/zh_CN'
import enUS from 'antd/es/locale/en_US'
import zhTW from 'antd/es/locale/zh_TW'

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
  const [exportPDFLoading, setExportPDFLoading] = React.useState(false)
  const [tourOpen, setTourOpen] = React.useState(false)

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
    const start = dayjs().startOf('month').format('YYYY-MM-DD')
    const end = dayjs().endOf('month').format('YYYY-MM-DD')
    const key = `export-${type}`
    if (type === 'excel') setExportExcelLoading(true)
    else setExportPDFLoading(true)
    message.open({ type: 'loading', content: t('loading.exporting'), key })
    const p = type === 'excel' ? exportExcel({ start, end, includeArchived }) : exportPDF({ start, end, includeArchived })
    p.then(() => {
      message.open({ type: 'success', content: type === 'excel' ? t('btn.exportExcel') + ' OK' : t('btn.exportPDF') + ' OK', key, duration: 2 })
    }).catch((e) => {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.open({ type: 'error', content: t('err.exportFailed', { msg }), key, duration: 3 })
    }).finally(() => {
      if (type === 'excel') setExportExcelLoading(false)
      else setExportPDFLoading(false)
    })
  }

  const onPageChange = (p, ps) => {
    setPage(p)
    if (ps && ps !== pageSize) setPageSize(ps)
  }

  const onOpenProject = async (id) => {
    setSelectedId(id)
    try {
      const p = await getProject(id)
      setSelectedProject(p)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.error(t('err.fetchProjectFailed', { msg }))
      return
    }
    try {
      const photos = await listProjectPhotos(id)
      setSelectedPhotos(Array.isArray(photos) ? photos : [])
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.error(t('err.fetchPhotosFailed', { msg }))
      setSelectedPhotos([])
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
    setUploadLoading(true)
    message.open({ type: 'loading', content: t('loading.uploading'), key })
    try {
      await uploadPhoto(selectedId, file)
      try {
        const photos = await listProjectPhotos(selectedId)
        setSelectedPhotos(Array.isArray(photos) ? photos : [])
      } catch {}
      message.open({ type: 'success', content: t('toast.photoUploaded'), key, duration: 2 })
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed'
      message.open({ type: 'error', content: t('err.uploadFailed', { msg }), key, duration: 3 })
    } finally {
      setUploadLoading(false)
    }
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
    const created = await seedAucklandDemos(10)
    await fetchData()
    if (created > 0) message.success(t('toast.seedCreated', { count: created }))
    else message.info(t('toast.seedEnough'))
  }

  const onLangChange = (lng) => {
    setLang(lng)
    setAppLanguage(lng)
  }

  const qs = React.useCallback((selector) => document.querySelector(selector), [])
  const tourSteps = React.useMemo(() => [
    {
      title: t('tour.mode.title'),
      description: t('tour.mode.desc'),
      target: () => qs('[data-tour-id="mode-select"]'),
      placement: 'bottom'
    },
    {
      title: t('tour.lang.title'),
      description: t('tour.lang.desc'),
      target: () => qs('[data-tour-id="lang-select"]'),
      placement: 'bottom'
    },
    {
      title: t('tour.search.title'),
      description: t('tour.search.desc'),
      target: () => qs('[data-tour-id="search-input"]'),
      placement: 'bottom'
    },
    {
      title: t('tour.export.title'),
      description: t('tour.export.desc'),
      target: () => qs('[data-tour-id="export-excel"]') || qs('[data-tour-id="export-pdf"]'),
      placement: 'bottom'
    },
    {
      title: t('tour.add.title'),
      description: t('tour.add.desc'),
      target: () => qs('[data-tour-id="add-project"]'),
      placement: 'bottom'
    },
    {
      title: t('tour.calendar.title'),
      description: t('tour.calendar.desc'),
      target: () => qs('[data-tour-id="calendar-view"]')
    },
    {
      title: t('tour.table.title'),
      description: t('tour.table.desc'),
      target: () => qs('[data-tour-id="project-table"]')
    }
  ], [t, qs])

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar
        onSearch={setQ}
        onAdd={() => setCreateOpen(true)}
        onExportExcel={() => onExport('excel')}
        onExportPDF={() => onExport('pdf')}
        exportExcelLoading={exportExcelLoading}
        exportPDFLoading={exportPDFLoading}
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
      />

      <div className="container mx-auto p-3 sm:p-4 flex flex-col gap-4">
        <div data-tour-id="calendar-view">
          <CalendarView projects={projects} onEventClick={onOpenProject} />
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

      <ProjectDrawer
        open={!!selectedProject}
        project={selectedProject}
        photos={selectedPhotos}
        onClose={() => setSelectedProject(null)}
        onSave={onSaveProject}
        onUpload={onUploadPhoto}
        onDeletePhoto={onDeletePhoto}
        onDeleteAllPhotos={onDeleteAllPhotos}
        onArchive={onArchive}
        onDelete={onDelete}
        saving={saveLoading}
        archiving={archiveLoading}
        deleting={deleteLoading}
        uploading={uploadLoading}
      />

      <CreateProjectModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={createLoading}
      />

      <Tour open={tourOpen} onClose={() => setTourOpen(false)} steps={tourSteps} mask closable />
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
