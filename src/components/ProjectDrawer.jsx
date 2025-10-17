import React from 'react'
import { Descriptions, Drawer, Form, Input, Select, Upload, Button, Space, Grid, Tag, Popconfirm, DatePicker, Image, App as AntdApp } from 'antd'
import { UploadOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { getPhotoDownloadUrl } from '../api'

export default function ProjectDrawer({ open, project, photos = [], onClose, onSave, onUpload, onArchive, onDelete, onDeletePhoto, onDeleteAllPhotos, saving = false, archiving = false, deleting = false, uploading = false }) {
  const [form] = Form.useForm()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm
  const [editMode, setEditMode] = React.useState(false)
  const [showNotes, setShowNotes] = React.useState(false)
  const { t } = useTranslation()
  const { message } = AntdApp.useApp()

  // Safely format a createdAt value to date+time (YYYY-MM-DD HH:mm). Never returns 'Invalid Date'.
  const formatPhotoTime = React.useCallback((v) => {
    if (!v) return ''
    let d
    if (Array.isArray(v)) {
      const [y, m = 1, d0 = 1, H = 0, M = 0, S = 0] = v
      d = dayjs(new Date(y, Math.max(0, (m - 1)), d0, H, M, S))
    } else {
      d = dayjs(v)
    }
    if (d.isValid()) return d.format('YYYY-MM-DD HH:mm')
    return typeof v === 'string' ? v : ''
  }, [])

  const normalizeStatus = (s) => {
    if (!s) return s
    if (s === '未开始') return 'not_started'
    if (s === '施工中') return 'in_progress'
    if (s === '完成') return 'completed'
    return s
  }
  const isCompleted = normalizeStatus(project?.status) === 'completed'

  React.useEffect(() => {
    if (project) {
      // Reset edit mode and sync form when project changes
      setEditMode(false)
      setShowNotes(false)
      const values = { ...project }
      if (project.start_date || project.end_date) {
        values.dates = [project.start_date ? dayjs(project.start_date) : null, project.end_date ? dayjs(project.end_date) : null].filter(Boolean)
      }
      const tmr = setTimeout(() => form.setFieldsValue(values), 0)
      return () => clearTimeout(tmr)
    }
  }, [project])

  const onFinish = async () => {
    const values = await form.validateFields()
    const payload = { ...values }
    if (values.dates && Array.isArray(values.dates)) {
      payload.start_date = values.dates[0] ? dayjs(values.dates[0]).format('YYYY-MM-DD') : ''
      payload.end_date = values.dates[1] ? dayjs(values.dates[1]).format('YYYY-MM-DD') : ''
      delete payload.dates
    }
    onSave(payload)
    if (editMode) setEditMode(false)
  }

  const handleArchive = () => {
    if (!project) return
    onArchive?.(!project.archived)
    if (editMode) setEditMode(false)
  }

  const handleDeleteConfirm = () => { onDelete?.() }

  const handleEnterEdit = () => {
    if (isCompleted) return
    setEditMode(true)
    setShowNotes(false)
    const values = { ...project, dates: [project?.start_date ? dayjs(project.start_date) : null, project?.end_date ? dayjs(project.end_date) : null].filter(Boolean) }
    form.setFieldsValue(values)
  }
  const handleCancelEdit = () => {
    setEditMode(false)
    setShowNotes(false)
    const values = { ...project, dates: [project?.start_date ? dayjs(project.start_date) : null, project?.end_date ? dayjs(project.end_date) : null].filter(Boolean) }
    form.setFieldsValue(values)
  }

  const statusOptions = [
    { label: t('status.not_started'), value: 'not_started' },
    { label: t('status.in_progress'), value: 'in_progress' },
    { label: t('status.completed'), value: 'completed' },
  ]

  // Build gallery items from photos (backend) and legacy local photo_url
  const galleryItems = React.useMemo(() => {
    const out = []
    if (Array.isArray(photos)) {
      photos.forEach(ph => {
        const isLocal = ph?.token === 'local' && project?.photo_url
        const src = isLocal ? project.photo_url : (project?.id && ph?.token ? getPhotoDownloadUrl(project.id, ph.token) : '')
        if (!src) return
        out.push({ key: ph.id || `${ph.token}`, src, alt: ph.caption || ph.contentType || 'photo', createdAt: ph.createdAt, photoId: ph.id, token: ph.token })
      })
    }
    // If no backend photo items but legacy photo_url exists, include it
    if (!out.length && project?.photo_url) {
      out.push({ key: 'legacy', src: project.photo_url, alt: 'photo', createdAt: project.created_at, photoId: 'local-1', token: 'local' })
    }
    return out
  }, [photos, project])

  // Upload validation: images only, <= 5MB
  const beforeUploadCheck = (file) => {
    const isImage = file?.type?.startsWith?.('image/')
    const under5M = file?.size ? file.size <= 5 * 1024 * 1024 : true
    if (!isImage || !under5M) {
      const reason = !isImage ? 'Only image files are allowed' : 'Image must be <= 5MB'
      message?.error(t('err.uploadFailed', { msg: reason }))
      return Upload.LIST_IGNORE
    }
    onUpload?.(file)
    return false
  }

  return (
    <Drawer open={open} onClose={onClose} width={isMobile ? '100%' : 520} title={(
      <div className="flex items-center gap-2">
        <span>{t('drawer.title')} {project?.project_code || ''}</span>
        {project?.archived ? <Tag>{t('tag.archived')}</Tag> : null}
        {isCompleted ? <Tag color="green">{t('tag.completed')}</Tag> : null}
      </div>
    )} destroyOnHidden>
      {project && (
        <Space direction="vertical" className="w-full" size="large">
          {!editMode && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label={t('field.projectName')}>{project.name}</Descriptions.Item>
              <Descriptions.Item label={t('field.address')}>{project.address}</Descriptions.Item>
              <Descriptions.Item label={t('field.client')}>{project.client_name} / {project.client_phone}</Descriptions.Item>
              <Descriptions.Item label={t('field.salesPerson')}>{project.sales_person}</Descriptions.Item>
              <Descriptions.Item label={t('field.installer')}>{project.installer}</Descriptions.Item>
              <Descriptions.Item label={t('field.dateRange')}>{project.start_date} ~ {project.end_date}</Descriptions.Item>
            </Descriptions>
          )}

          {/* Edit form (full) or quick update form */}
          <Form layout="vertical" form={form} initialValues={project} onFinish={onFinish}>
            {editMode ? (
              <div className="grid grid-cols-1 gap-3">
                <Form.Item name="name" label={t('field.projectName')} rules={[{ required: true, message: t('validation.requiredProjectName') }]}>
                  <Input placeholder={t('placeholder.projectName')} disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="address" label={t('field.address')} rules={[{ required: true, message: t('validation.requiredAddress') }]}>
                  <Input placeholder={t('placeholder.address')} disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="client_name" label={t('field.clientName')} rules={[{ required: true, message: t('validation.requiredClientName') }]}>
                  <Input disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="client_phone" label={t('field.clientPhone')} rules={[{ required: true, message: t('validation.requiredClientPhone') }]}>
                  <Input disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="sales_person" label={t('field.salesPerson')} rules={[{ required: true, message: t('validation.requiredSalesPerson') }]}>
                  <Input placeholder={t('placeholder.salesPerson')} disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="installer" label={t('field.installer')} rules={[{ required: true, message: t('validation.requiredInstaller') }]}>
                  <Input placeholder={t('placeholder.installer')} disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="team_members" label={t('field.teamMembers')}>
                  <Input placeholder={t('placeholder.teamMembers')} disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="dates" label={t('field.dateRange')} rules={[{ required: true, message: t('validation.requiredDates') }]}>
                  <DatePicker.RangePicker format="YYYY-MM-DD" className="w-full" getPopupContainer={() => document.body} disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="status" label={t('field.status')}>
                  <Select disabled={isCompleted} options={statusOptions} onChange={() => setShowNotes(true)} getPopupContainer={() => document.body} />
                </Form.Item>
                <Form.Item name="today_task" label={t('field.todayTask')}>
                  <Input.TextArea rows={2} placeholder={t('placeholder.todayTask')} disabled={isCompleted} />
                </Form.Item>
                {showNotes && (
                  <Form.Item name="progress_note" label={t('field.progressNote')}>
                    <Input.TextArea rows={3} placeholder={t('placeholder.progressNote')} disabled={isCompleted} />
                  </Form.Item>
                )}
              </div>
            ) : (
              <>
                <Form.Item name="today_task" label={t('field.todayTask')}>
                  <Input.TextArea rows={2} placeholder={t('placeholder.todayTask')} disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="progress_note" label={t('field.progressNote')}>
                  <Input.TextArea rows={3} placeholder={t('placeholder.progressNote')} disabled={isCompleted} />
                </Form.Item>
                <Form.Item name="status" label={t('field.status')}>
                  <Select disabled={isCompleted} options={statusOptions} getPopupContainer={() => document.body} />
                </Form.Item>
              </>
            )}

            <Space wrap>
              {!isCompleted && <Button type="primary" onClick={onFinish} loading={saving} disabled={archiving || deleting}>{t('btn.save')}</Button>}
              {!editMode && !isCompleted && <Button onClick={handleEnterEdit} disabled={saving || archiving || deleting}>{t('btn.edit')}</Button>}
              {editMode && !isCompleted && <Button onClick={handleCancelEdit} disabled={saving || archiving || deleting}>{t('btn.cancelEdit')}</Button>}
              <Button onClick={onClose}>{t('btn.close')}</Button>
              <Button icon={<InboxOutlined />} onClick={handleArchive} loading={archiving} disabled={saving || deleting}>{project.archived ? t('btn.unarchive') : t('btn.archive')}</Button>
              <Popconfirm title={t('modal.delete.confirm')} okText={t('modal.delete.ok') || 'OK'} cancelText={t('modal.delete.cancel') || 'Cancel'} onConfirm={handleDeleteConfirm} okButtonProps={{ 'data-testid': 'confirm-delete' }}>
                <Button danger icon={<DeleteOutlined />} loading={deleting} disabled={saving || archiving}>{t('btn.delete')}</Button>
              </Popconfirm>
            </Space>
          </Form>

          <div>
            <div className="font-medium mb-2 flex items-center justify-between">
              <span>{t('photos.section')}</span>
              {!!galleryItems.length && (
                <Popconfirm title={t('modal.deleteAllPhotos.confirm')} okText={t('modal.delete.ok') || 'OK'} cancelText={t('modal.delete.cancel') || 'Cancel'} onConfirm={() => onDeleteAllPhotos?.()}>
                  <Button danger size="small">{t('btn.deleteAllPhotos')}</Button>
                </Popconfirm>
              )}
            </div>
            {!!galleryItems.length && (
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
                  {galleryItems.map(item => {
                    const timeText = formatPhotoTime(item.createdAt)
                    const deleteRef = item.photoId ? item.photoId : (item.token && item.token !== 'local' ? `token:${item.token}` : 'local-1')
                    return (
                      <div key={item.key} className="relative group rounded overflow-hidden border bg-slate-50">
                        <Image
                          src={item.src}
                          alt={item.alt}
                          preview
                          placeholder
                          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white px-2 py-1 text-[11px] flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {timeText ? <span className="text-white/90">{timeText}</span> : <span />}
                          <Button
                            size="middle"
                            danger
                            type="text"
                            icon={<DeleteOutlined style={{ fontSize: 18 }} />}
                            onClick={(e) => { e.stopPropagation(); onDeletePhoto?.(deleteRef) }}
                            disabled={isCompleted}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Image.PreviewGroup>
            )}
            <Upload
              accept="image/*"
              showUploadList={false}
              disabled={isCompleted || uploading}
              beforeUpload={beforeUploadCheck}
            >
              <Button icon={<UploadOutlined />} disabled={isCompleted} loading={uploading}>{t('btn.uploadPhoto')}</Button>
            </Upload>
          </div>
        </Space>
      )}
    </Drawer>
  )
}