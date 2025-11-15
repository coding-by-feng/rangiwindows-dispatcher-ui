import React from 'react'
import { Descriptions, Drawer, Form, Input, Select, Upload, Button, Space, Grid, Tag, Popconfirm, Image, App as AntdApp, Spin, List, Typography, Tooltip } from 'antd'
import { UploadOutlined, DeleteOutlined, InboxOutlined, DownloadOutlined, LoadingOutlined, CheckCircleTwoTone, CloseCircleTwoTone, ClockCircleTwoTone, ClearOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { getPhotoDownloadUrl, downloadProjectPhoto } from '../api'
import { normalizeStatus } from '../utils/status'
import ProjectFormFields from './ProjectFormFields'

// Simple media with retry: now manual click retries (max 5). On error shows clickable overlay; waits 0.5s before reload.
function MediaWithRetry({ item, height = 160 }) {
  const MAX_ATTEMPTS = 5
  const [attempt, setAttempt] = React.useState(0) // manual attempts performed
  const [curSrc, setCurSrc] = React.useState(item.src)
  const [loaded, setLoaded] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const [waiting, setWaiting] = React.useState(false)
  const waitTimerRef = React.useRef(null)

  const isVideo = (item.contentType || '').startsWith('video/')

  const addCacheBust = React.useCallback((s, a) => {
    try {
      if (!s || typeof s !== 'string') return s
      if (s.startsWith('data:')) return s
      const sep = s.includes('?') ? '&' : '?'
      return `${s}${sep}retry=${a}&_=${Date.now()}`
    } catch { return s }
  }, [])

  React.useEffect(() => {
    // Reset if item changes
    setAttempt(0)
    setCurSrc(item.src)
    setLoaded(false)
    setFailed(false)
    setWaiting(false)
    if (waitTimerRef.current) { clearTimeout(waitTimerRef.current); waitTimerRef.current = null }
  }, [item.src])

  const cleanupTimer = React.useCallback(() => {
    if (waitTimerRef.current) { clearTimeout(waitTimerRef.current); waitTimerRef.current = null }
  }, [])

  React.useEffect(() => () => cleanupTimer(), [cleanupTimer])

  const handleLoaded = React.useCallback(() => {
    setLoaded(true)
    setFailed(false)
  }, [])

  const handleError = React.useCallback(() => {
    setLoaded(false)
    setFailed(true)
  }, [])

  const handleManualRetry = React.useCallback(() => {
    if (waiting) return
    if (attempt >= MAX_ATTEMPTS) return
    // Prepare next attempt
    setWaiting(true)
    cleanupTimer()
    waitTimerRef.current = setTimeout(() => {
      waitTimerRef.current = null
      const next = attempt + 1
      setAttempt(next)
      setFailed(false)
      setLoaded(false)
      setCurSrc(addCacheBust(item.src, next))
      setWaiting(false)
    }, 500)
  }, [attempt, waiting, item.src, addCacheBust, cleanupTimer])

  const showAttemptBadge = attempt > 0 && !failed && !waiting && !loaded

  const commonOverlay = (() => {
    if (waiting) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
          <Spin size="small" />
          <span style={{ fontSize: 11, marginTop: 4 }}>Retrying...</span>
        </div>
      )
    }
    if (!loaded && !failed) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
          <Spin size="small" />
        </div>
      )
    }
    if (failed) {
      const noMore = attempt >= MAX_ATTEMPTS
      const hint = noMore
        ? 'Load failed (max retries)'
        : (attempt === 0
            ? 'Load failed – click to reload'
            : `Load failed – click to reload (${attempt}/${MAX_ATTEMPTS})`)
      return (
        <div
          role={!noMore ? 'button' : undefined}
          aria-label={!noMore ? 'Retry loading media' : 'Load failed'}
          onClick={!noMore ? handleManualRetry : undefined}
          style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#b91c1c', fontSize: 12, cursor: noMore ? 'not-allowed' : 'pointer', textAlign: 'center', padding: '0 6px', lineHeight: 1.3 }}
        >
          <span style={{ fontWeight: 500 }}>{item.alt || (isVideo ? 'video' : 'image')}</span>
          <span style={{ marginTop: 4 }}>{hint}</span>
        </div>
      )
    }
    return null
  })()

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden' }}>
      {!isVideo ? (
        <Image
          src={curSrc}
          alt={item.alt}
          preview={!failed}
          onLoad={handleLoaded}
          onError={handleError}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded && !failed ? 'block' : 'none' }}
        />
      ) : (
        <video
          src={curSrc}
          onCanPlayThrough={handleLoaded}
          onLoadedData={handleLoaded}
          onError={handleError}
          controls={!failed}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded && !failed ? 'block' : 'none', background: '#000' }}
        />
      )}
      {commonOverlay}
      {showAttemptBadge && (
        <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">Attempt {attempt}</div>
      )}
    </div>
  )
}

export default function ProjectDrawer({ open, project, photos = [], onClose, onSave, onUpload, onUploadMany, onArchive, onDelete, onDeletePhoto, onDeleteAllPhotos, saving = false, archiving = false, deleting = false, uploading = false, loading = false, uploadTasks = [], onClearUploadTasks }) {
  const [form] = Form.useForm()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm
  const [editMode, setEditMode] = React.useState(false)
  const [showNotes, setShowNotes] = React.useState(false)
  const { t } = useTranslation()
  const { message } = AntdApp.useApp()

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

  const isFinalized = normalizeStatus(project?.status) === 'final_payment_received'

  // Items list (define before effects that depend on it)
  const galleryItems = React.useMemo(() => {
    const out = []
    if (Array.isArray(photos)) {
      photos.forEach(ph => {
        // Prefer explicit src from API/local; otherwise build download URL
        const src = ph?.src || (project?.id && ph?.token ? getPhotoDownloadUrl(project.id, ph.token) : '')
        if (!src) return
        const ct = ph?.contentType || ''
        out.push({ key: ph.id || `${ph.token}`, src, alt: ph.caption || ct || 'asset', createdAt: ph.createdAt, photoId: ph.id, token: ph.token, contentType: ct })
      })
    }
    // If no backend photo items but legacy photo_url exists, include it
    if (!out.length && project?.photo_url) {
      out.push({ key: 'legacy', src: project.photo_url, alt: 'photo', createdAt: project.created_at, photoId: 'local-1', token: 'local', contentType: 'image/jpeg' })
    }
    return out
  }, [photos, project])

  // Populate form on project load
  React.useEffect(() => {
    if (!project) return
    setEditMode(false)
    setShowNotes(false)
    const values = { ...project }
    if (project.start_date || project.end_date) {
      values.dates = [project.start_date ? dayjs(project.start_date) : null, project.end_date ? dayjs(project.end_date) : null].filter(Boolean)
    }
    const tmr = setTimeout(() => form.setFieldsValue(values), 0)
    return () => clearTimeout(tmr)
  }, [project])

  // Actions
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
    if (isFinalized) return
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
    { label: t('status.glass_ordered'), value: 'glass_ordered' },
    { label: t('status.doors_windows_produced'), value: 'doors_windows_produced' },
    { label: t('status.doors_windows_delivered'), value: 'doors_windows_delivered' },
    { label: t('status.doors_windows_installed'), value: 'doors_windows_installed' },
    { label: t('status.final_payment_received'), value: 'final_payment_received' },
  ]

  const handleDownload = (token) => {
    if (!project?.id || !token) return
    const baseName = project?.project_code ? `${project.project_code}_${token}` : `file_${project.id}_${token}`
    downloadProjectPhoto(project.id, token, `${baseName}`).catch(() => {})
  }

  // Upload helpers
  const MB = 1024 * 1024

  // Simplified: just validate types; compression handled upstream
  const preprocessFiles = async (files) => {
    const processed = []
    for (const f of files) {
      const type = f?.type || ''
      const isImage = type.startsWith('image/')
      const isVideo = type.startsWith('video/')
      if (!isImage && !isVideo) {
        message?.warning(t('err.uploadFailed', { msg: 'Only images or videos are allowed' }))
        continue
      }
      processed.push(f)
    }
    return processed
  }

  const validateAndPrepare = async (fileList) => {
    const files = Array.isArray(fileList) ? fileList : []
    return await preprocessFiles(files)
  }

  const beforeUploadCheck = (file, fileList) => {
    if (isFinalized) return Upload.LIST_IGNORE
    if (fileList && file === fileList[0]) {
      ;(async () => {
        const ready = await validateAndPrepare(fileList)
        if (ready.length) {
          if (typeof onUpload === 'function') {
            for (const f of ready) {
              try { await onUpload(f) } catch {}
            }
          } else if (typeof onUploadMany === 'function') {
            onUploadMany(ready)
          }
        }
      })()
    }
    return false
  }

  return (
    <Drawer open={open} onClose={onClose} width={isMobile ? '100%' : 520} title={(
      <div className="flex items-center gap-2">
        <span>{t('drawer.title')} {project?.project_code || ''}</span>
        {project?.archived ? <Tag>{t('tag.archived')}</Tag> : null}
        {isFinalized ? <Tag color="green">{t('tag.completed')}</Tag> : null}
      </div>
    )} destroyOnHidden>
      {(!project && loading) && (
        <div className="py-10 flex items-center justify-center">
          <Spin size="large" />
        </div>
      )}
      {project && (
        <div role="dialog" aria-label={`${t('drawer.title')} ${project?.project_code || ''}`}>
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

            <Form layout="vertical" form={form} initialValues={project} onFinish={onFinish} requiredMark={false}>
              {editMode ? (
                <ProjectFormFields disabled={isFinalized} showNotes={showNotes} onStatusChange={() => setShowNotes(true)} layout="one-column" withValidation={true} />
              ) : (
                <>
                  <Form.Item name="today_task" label={t('field.todayTask')}>
                    <Input.TextArea rows={2} placeholder={t('placeholder.todayTask')} disabled={isFinalized} data-tour-id="drawer-today-task" />
                  </Form.Item>
                  <Form.Item name="progress_note" label={t('field.progressNote')}>
                    <Input.TextArea rows={3} placeholder={t('placeholder.progressNote')} disabled={isFinalized} data-tour-id="drawer-progress-note" />
                  </Form.Item>
                  <Form.Item name="change_note" label={t('field.changeNote')}>
                    <Input.TextArea rows={2} placeholder={t('placeholder.changeNote')} disabled={isFinalized} data-tour-id="drawer-change-note" />
                  </Form.Item>
                  <Form.Item name="status" label={t('field.status')}>
                    <Select disabled={isFinalized} options={statusOptions} getPopupContainer={() => document.body} data-tour-id="drawer-status" />
                  </Form.Item>
                </>
              )}

              <Space wrap>
                {!isFinalized && <Button type="primary" onClick={onFinish} loading={saving} disabled={archiving || deleting} data-tour-id="drawer-save">{t('btn.save')}</Button>}
                {!editMode && !isFinalized && <Button onClick={handleEnterEdit} disabled={saving || archiving || deleting} data-tour-id="drawer-edit">{t('btn.edit')}</Button>}
                {editMode && !isFinalized && <Button onClick={handleCancelEdit} disabled={saving || archiving || deleting} data-tour-id="drawer-cancel-edit">{t('btn.cancelEdit')}</Button>}
                <Button onClick={onClose} data-tour-id="drawer-close">{t('btn.close')}</Button>
                <Button icon={<InboxOutlined />} onClick={handleArchive} loading={archiving} disabled={saving || deleting} data-tour-id="drawer-archive">{project.archived ? t('btn.unarchive') : t('btn.archive')}</Button>
                <Popconfirm title={t('modal.delete.confirm')} okText={t('modal.delete.ok') || 'OK'} cancelText={t('modal.delete.cancel') || 'Cancel'} onConfirm={handleDeleteConfirm} okButtonProps={{ 'data-testid': 'confirm-delete' }}>
                  <Button danger icon={<DeleteOutlined />} loading={deleting} disabled={saving || archiving} data-tour-id="drawer-delete">{t('btn.delete')}</Button>
                </Popconfirm>
              </Space>
            </Form>

            <div>
              <div className="font-medium mb-2 flex items-center justify-between">
                <span>{t('photos.section')}</span>
                {!!galleryItems.length && (
                  <Popconfirm title={t('modal.deleteAllPhotos.confirm')} okText={t('modal.delete.ok') || 'OK'} cancelText={t('modal.delete.cancel') || 'Cancel'} onConfirm={() => onDeleteAllPhotos?.()}>
                    <Button danger size="small" data-tour-id="drawer-delete-all-photos">{t('btn.deleteAllPhotos')}</Button>
                  </Popconfirm>
                )}
              </div>
              {!!galleryItems.length && (
                <Image.PreviewGroup>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
                    {galleryItems.map((item) => {
                      const timeText = formatPhotoTime(item.createdAt)
                      const deleteRef = item.photoId ? item.photoId : (item.token && item.token !== 'local' ? `token:${item.token}` : 'local-1')

                      return (
                        <div key={item.key} className="relative group rounded overflow-hidden border bg-slate-50">
                          <MediaWithRetry item={item} height={160} />
                          <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white px-2 py-1 text-[11px] flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {timeText ? <span className="text-white/90">{timeText}</span> : <span />}
                            <div className="flex items-center gap-1">
                              <Button
                                size="small"
                                type="text"
                                icon={<DownloadOutlined style={{ fontSize: 14, color: '#fff' }} />}
                                onClick={(e) => { e.stopPropagation(); handleDownload(item.token) }}
                              />
                              <Button
                                size="small"
                                danger
                                type="text"
                                icon={<DeleteOutlined style={{ fontSize: 14 }} />}
                                onClick={(e) => { e.stopPropagation(); onDeletePhoto?.(deleteRef) }}
                                disabled={isFinalized}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Image.PreviewGroup>
              )}

              <Upload
                accept="image/*,video/*"
                showUploadList={false}
                multiple
                disabled={isFinalized || uploading}
                beforeUpload={beforeUploadCheck}
              >
                <Button icon={<UploadOutlined />} disabled={isFinalized} loading={uploading} data-tour-id="drawer-upload">{t('btn.uploadPhoto')}</Button>
              </Upload>

              {/* Per-file upload status list */}
              {Array.isArray(uploadTasks) && uploadTasks.length > 0 && (
                <div className="mt-3 bg-white rounded border p-2">
                  <div className="flex items-center justify-between mb-1">
                    <Typography.Text strong>{t('loading.uploading')}</Typography.Text>
                    <Button size="small" type="text" icon={<ClearOutlined />} onClick={onClearUploadTasks} disabled={uploading}>
                      {t('btn.collapse')}
                    </Button>
                  </div>
                  <List
                    size="small"
                    dataSource={uploadTasks}
                    renderItem={(it) => {
                      const status = it.status
                      let icon = <ClockCircleTwoTone twoToneColor="#A3A3A3" />
                      if (status === 'uploading') icon = <LoadingOutlined />
                      else if (status === 'compressing') icon = <LoadingOutlined />
                      else if (status === 'success') icon = <CheckCircleTwoTone twoToneColor="#22C55E" />
                      else if (status === 'failed') icon = <CloseCircleTwoTone twoToneColor="#EF4444" />
                      const sizeKB = it.size ? Math.round(it.size / 1024) : 0
                      const comp = typeof it.compressPct === 'number' ? it.compressPct : null
                      const upl = typeof it.uploadPct === 'number' ? it.uploadPct : null
                      return (
                        <List.Item style={{ padding: '2px 0' }}>
                          <Space size={6}>
                            {icon}
                            <Tooltip title={it.name}>
                              <Typography.Text style={{ maxWidth: 180 }} ellipsis>{it.name}</Typography.Text>
                            </Tooltip>
                            <Typography.Text type="secondary">{sizeKB}KB</Typography.Text>
                            {(comp != null || upl != null) && (
                              <Typography.Text type="secondary">
                                {comp != null ? `C ${Math.min(100, Math.max(0, Math.round(comp)))}%` : ''}
                                {comp != null && upl != null ? ' · ' : ''}
                                {upl != null ? `U ${Math.min(100, Math.max(0, Math.round(upl)))}%` : ''}
                              </Typography.Text>
                            )}
                            {typeof it.attempts === 'number' && it.attempts > 0 && (
                              <Typography.Text type="secondary">x{it.attempts}</Typography.Text>
                            )}
                            {it.error && <Typography.Text type="danger">{it.error}</Typography.Text>}
                          </Space>
                        </List.Item>
                      )
                    }}
                  />
                </div>
              )}
            </div>
          </Space>
        </div>
      )}
    </Drawer>
  )
}
