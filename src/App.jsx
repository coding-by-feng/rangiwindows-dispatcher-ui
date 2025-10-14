import React from 'react'
import { ConfigProvider, App as AntdApp, message } from 'antd'
import dayjs from 'dayjs'
import HeaderBar from './components/HeaderBar'
import CalendarView from './components/CalendarView'
import ProjectTable from './components/ProjectTable'
import ProjectDrawer from './components/ProjectDrawer'
import CreateProjectModal from './components/CreateProjectModal'
import { listProjects, createProject, updateProject, uploadPhoto, exportExcel, exportPDF, getProject } from './api'

export default function App() {
  const [projects, setProjects] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState(null)
  const [selectedProject, setSelectedProject] = React.useState(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [status, setStatus] = React.useState()

  const fetchData = async (params = {}) => {
    setLoading(true)
    try {
      const data = await listProjects(params)
      setProjects(data)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { fetchData({ q, status }) }, [q, status])

  const onExport = (type) => {
    const start = dayjs().startOf('month').format('YYYY-MM-DD')
    const end = dayjs().endOf('month').format('YYYY-MM-DD')
    if (type === 'excel') exportExcel({ start, end })
    else exportPDF({ start, end })
  }

  const onOpenProject = async (id) => {
    setSelectedId(id)
    const p = await getProject(id)
    setSelectedProject(p)
  }

  const onSaveProject = async (values) => {
    if (!selectedId) return
    const updated = await updateProject(selectedId, values)
    setSelectedProject(updated)
    message.success('已保存')
    fetchData({ q, status })
  }

  const onUploadPhoto = async (file) => {
    if (!selectedId) return
    await uploadPhoto(selectedId, file)
    const p = await getProject(selectedId)
    setSelectedProject(p)
    message.success('上传成功')
  }

  const onCreate = async (values) => {
    const created = await createProject(values)
    setCreateOpen(false)
    message.success('项目已创建')
    fetchData({ q, status })
    onOpenProject(created.id)
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#0891b2' } }}>
      <AntdApp>
        <div className="min-h-screen flex flex-col">
          <HeaderBar
            onSearch={setQ}
            onAdd={() => setCreateOpen(true)}
            onExportExcel={() => onExport('excel')}
            onExportPDF={() => onExport('pdf')}
            status={status}
            onStatusChange={setStatus}
          />

          <div className="container mx-auto p-4 flex flex-col gap-4">
            <CalendarView projects={projects} onEventClick={onOpenProject} />
            <div className="bg-white rounded border p-3">
              <ProjectTable projects={projects} loading={loading} onRowClick={onOpenProject} />
            </div>
          </div>

          <ProjectDrawer
            open={!!selectedProject}
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onSave={onSaveProject}
            onUpload={onUploadPhoto}
          />

          <CreateProjectModal open={createOpen} onCancel={() => setCreateOpen(false)} onOk={onCreate} />
        </div>
      </AntdApp>
    </ConfigProvider>
  )
}

