import React from 'react'
import { Descriptions, Drawer, Form, Input, Upload, Button, Space, Grid, Tag, Popconfirm, Image, App as AntdApp, Spin, List, Typography, Tooltip, Switch } from 'antd'
import { UploadOutlined, DeleteOutlined, InboxOutlined, DownloadOutlined, LoadingOutlined, CheckCircleTwoTone, CloseCircleTwoTone, ClockCircleTwoTone, ClearOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { getPhotoDownloadUrl, downloadProjectPhoto } from '../api'
import ProjectFormFields from './ProjectFormFields'
import { getCachedObjectUrlForMedia } from '../utils/mediaCache'

// Simple media with retry + Cache API-backed object URL loader.
function MediaWithRetry({ item, height = 160 }) {
  const MAX_ATTEMPTS = 5
  const [attempt, setAttempt] = React.useState(0)
  const [curSrc, setCurSrc] = React.useState(item.src)
  const [blobUrl, setBlobUrl] = React.useState('')
  const [loaded, setLoaded] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const [waiting, setWaiting] = React.useState(false)
  const waitTimerRef = React.useRef(null)

  const isVideo = (item.contentType || '').startsWith('video/')

  // Load via Cache API -> blob URL when token exists
  React.useEffect(() => {
    let active = true
    const doLoad = async () => {
      try {
        setLoaded(false); setFailed(false)
        // If has token and projectId, try cache-backed blob URL; else use direct src
        if (item.projectId && item.token && item.token !== 'local' && item.src) {
          const url = await getCachedObjectUrlForMedia(item.projectId, item.token, item.src)
          if (!active) return
          // Revoke previous blobUrl
          if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl)
          setBlobUrl(url)
          setCurSrc(url)
        } else {
          setCurSrc(item.src)
        }
      } catch {
        setCurSrc(item.src)
      }
    }
    doLoad()
    return () => { active = false; if (waitTimerRef.current) { clearTimeout(waitTimerRef.current); waitTimerRef.current = null } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.projectId, item.token, item.src])

  React.useEffect(() => () => { if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl) }, [blobUrl])

  const addCacheBust = React.useCallback((s, a) => {
    try {
      if (!s || typeof s !== 'string') return s
      if (s.startsWith('data:') || s.startsWith('blob:')) return s
      const sep = s.includes('?') ? '&' : '?'
      return `${s}${sep}retry=${a}&_=${Date.now()}`
    } catch { return s }
  }, [])

  React.useEffect(() => {
    // Reset attempt status when source changes
    setAttempt(0)
    setLoaded(false)
    setFailed(false)
    setWaiting(false)
    if (waitTimerRef.current) { clearTimeout(waitTimerRef.current); waitTimerRef.current = null }
  }, [curSrc])

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
        : (attempt === 0 ? 'Load failed – click to reload' : `Load failed – click to reload (${attempt}/${MAX_ATTEMPTS})`)
      return (
        <div role={!noMore ? 'button' : undefined} aria-label={!noMore ? 'Retry loading media' : 'Load failed'} onClick={!noMore ? handleManualRetry : undefined} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#b91c1c', fontSize: 12, cursor: noMore ? 'not-allowed' : 'pointer', textAlign: 'center', padding: '0 6px', lineHeight: 1.3 }}>
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
        <Image src={curSrc} alt={item.alt} preview={!failed} onLoad={handleLoaded} onError={handleError} style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded && !failed ? 'block' : 'none' }} />
      ) : (
        <video src={curSrc} onCanPlayThrough={handleLoaded} onLoadedData={handleLoaded} onError={handleError} controls={!failed} muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded && !failed ? 'block' : 'none', background: '#000' }} />
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

  // Download a media by token
  const handleDownload = React.useCallback(async (token) => {
    if (!project?.id || !token) return
    try {
      await downloadProjectPhoto(project.id, token)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Download failed'
      message.error(msg)
    }
  }, [project?.id, message])

  // Intercept Upload to use our custom upload handlers; prevent default auto-upload
  const beforeUploadCheck = React.useCallback((file, fileList) => {
    try {
      if (Array.isArray(fileList) && fileList.length > 1) {
        const first = fileList[0]
        if (file.uid === first.uid) {
          onUploadMany?.(fileList)
        }
      } else {
        onUpload?.(file)
      }
    } catch {}
    return false
  }, [onUpload, onUploadMany])

  const formatPhotoTime = React.useCallback((v) => {
    if (!v) return ''
    let d
    if (Array.isArray(v)) { const [y, m = 1, d0 = 1, H = 0, M = 0, S = 0] = v; d = dayjs(new Date(y, Math.max(0, (m - 1)), d0, H, M, S)) }
    else { d = dayjs(v) }
    return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : (typeof v === 'string' ? v : '')
  }, [])

  const isFinalized = false

  const galleryItems = React.useMemo(() => {
    const out = []
    if (Array.isArray(photos)) {
      photos.forEach(ph => {
        const src = ph?.src || (project?.id && ph?.token ? getPhotoDownloadUrl(project.id, ph.token) : '')
        if (!src) return
        const ct = ph?.contentType || ''
        out.push({ key: ph.id || `${ph.token}`, src, alt: ph.caption || ct || 'asset', createdAt: ph.createdAt, photoId: ph.id, token: ph.token, contentType: ct, projectId: project?.id })
      })
    }
    if (!out.length && project?.photo_url) {
      out.push({ key: 'legacy', src: project.photo_url, alt: 'photo', createdAt: project.created_at, photoId: 'local-1', token: 'local', contentType: 'image/jpeg', projectId: project?.id })
    }
    return out
  }, [photos, project])

  React.useEffect(() => {
    if (!project) return
    setEditMode(false); setShowNotes(false)
    const values = { ...project }
    if (project.start_date || project.end_date) {
      values.dates = [project.start_date ? dayjs(project.start_date) : null, project.end_date ? dayjs(project.end_date) : null].filter(Boolean)
    }
    values.stages = { ...(project.stages || {}) }
    const tmr = setTimeout(() => form.setFieldsValue(values), 0)
    return () => clearTimeout(tmr)
  }, [project])

  React.useEffect(() => {
    if (editMode && project) {
      const values = { stages: { ...(project.stages || {}) } }
      // Defer slightly to ensure items are mounted
      const t = setTimeout(() => form.setFieldsValue(values), 0)
      return () => clearTimeout(t)
    }
  }, [editMode, project])

  const onFinish = async () => {
    const values = await form.validateFields()
    const payload = { ...values }
    if (values.dates && Array.isArray(values.dates)) {
      payload.start_date = values.dates[0] ? dayjs(values.dates[0]).format('YYYY-MM-DD') : ''
      payload.end_date = values.dates[1] ? dayjs(values.dates[1]).format('YYYY-MM-DD') : ''
      delete payload.dates
    }
    // Include stages (flags + remarks) in main update
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
    setEditMode(true); setShowNotes(true)
    const values = { ...project, dates: [project?.start_date ? dayjs(project.start_date) : null, project?.end_date ? dayjs(project.end_date) : null].filter(Boolean), stages: { ...(project?.stages || {}) } }
    form.setFieldsValue(values)
  }

  const handleCancelEdit = () => {
    setEditMode(false); setShowNotes(false)
    const values = { ...project, dates: [project?.start_date ? dayjs(project.start_date) : null, project?.end_date ? dayjs(project.end_date) : null].filter(Boolean), stages: { ...(project?.stages || {}) } }
    form.setFieldsValue(values)
  }

  const StageRow = ({ flagKey, remarkKey, label, remarkLabel }) => {
    return (
      <div className="flex items-center gap-2">
        <Form.Item name={[ 'stages', flagKey ]} valuePropName="checked" noStyle>
          <Switch size="small" />
        </Form.Item>
        <span className="w-16 text-slate-700">{label}</span>
        <Form.Item name={[ 'stages', remarkKey ]} noStyle>
          <Input size="small" placeholder={remarkLabel} maxLength={255} />
        </Form.Item>
      </div>
    )
  }

  return (
    <Drawer open={open} onClose={onClose} width={isMobile ? '100%' : 520} title={(<div className="flex items-center gap-2"><span>{t('drawer.title')} {project?.project_code || ''}</span>{project?.archived ? <Tag>{t('tag.archived')}</Tag> : null}</div>)} destroyOnHidden>
      {(!project && loading) && (<div className="py-10 flex items-center justify-center"><Spin size="large" /></div>)}
      {project && (
        <div role="dialog" aria-label={`${t('drawer.title')} ${project?.project_code || ''}`}>
          <Space direction="vertical" className="w-full" size="large">
            {!editMode && (
              <>
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label={t('field.projectName')}>{project.name}</Descriptions.Item>
                  <Descriptions.Item label={t('field.address')}>{project.address}</Descriptions.Item>
                  <Descriptions.Item label={t('field.client')}>{project.client_name}</Descriptions.Item>
                  <Descriptions.Item label={t('field.salesPerson')}>{project.sales_person}</Descriptions.Item>
                  <Descriptions.Item label={t('field.installer')}>{project.installer}</Descriptions.Item>
                  <Descriptions.Item label={t('field.dateRange')}>{project.start_date} ~ {project.end_date}</Descriptions.Item>
                </Descriptions>
                {/* View-mode: show stage status + remarks */}
                <div className="bg-white rounded border p-2 space-y-1 mt-2">
                  <Typography.Text strong>{t('filter.stages')}</Typography.Text>
                  {(() => {
                    const st = project?.stages || {}
                    const items = [
                      { k: 'glass', label: t('stage.glass'), remark: st.glassRemark, flag: !!st.glass },
                      { k: 'frame', label: t('stage.frame'), remark: st.frameRemark, flag: !!st.frame },
                      { k: 'purchase', label: t('stage.purchase'), remark: st.purchaseRemark, flag: !!st.purchase },
                      { k: 'transport', label: t('stage.transport'), remark: st.transportRemark, flag: !!st.transport },
                      { k: 'install', label: t('stage.install'), remark: st.installRemark, flag: !!st.install },
                      { k: 'repair', label: t('stage.repair'), remark: st.repairRemark, flag: !!st.repair },
                    ]
                    return items.map(it => (
                      <div key={it.k} className="flex items-center gap-2 text-[13px]">
                        {it.flag ? <CheckCircleTwoTone twoToneColor="#22C55E" /> : <CloseCircleTwoTone twoToneColor="#A3A3A3" />}
                        <span className="w-16 text-slate-700">{it.label}</span>
                        <span className="text-slate-600">{it.remark || ''}</span>
                      </div>
                    ))
                  })()}
                </div>
              </>
            )}

            <Form layout="vertical" form={form} initialValues={project} onFinish={onFinish} requiredMark={false}>
              {editMode ? (
                <>
                  <ProjectFormFields disabled={isFinalized} showNotes={showNotes} onStatusChange={() => setShowNotes(true)} layout="one-column" withValidation={true} />
                  <div className="bg-white rounded border p-2 space-y-2 mt-2">
                    <Typography.Text strong>{t('filter.stages')}</Typography.Text>
                    <StageRow flagKey="glass" remarkKey="glassRemark" label={t('stage.glass')} remarkLabel={t('stageRemark.glass')} />
                    <StageRow flagKey="frame" remarkKey="frameRemark" label={t('stage.frame')} remarkLabel={t('stageRemark.frame')} />
                    <StageRow flagKey="purchase" remarkKey="purchaseRemark" label={t('stage.purchase')} remarkLabel={t('stageRemark.purchase')} />
                    <StageRow flagKey="transport" remarkKey="transportRemark" label={t('stage.transport')} remarkLabel={t('stageRemark.transport')} />
                    <StageRow flagKey="install" remarkKey="installRemark" label={t('stage.install')} remarkLabel={t('stageRemark.install')} />
                    <StageRow flagKey="repair" remarkKey="repairRemark" label={t('stage.repair')} remarkLabel={t('stageRemark.repair')} />
                  </div>
                </>
              ) : (
                <>
                  <Form.Item name="today_task" label={t('field.todayTask')}>
                    <Input.TextArea rows={2} placeholder={t('placeholder.todayTask')} disabled={true} data-tour-id="drawer-today-task" />
                  </Form.Item>
                  <Form.Item name="progress_note" label={t('field.progressNote')}>
                    <Input.TextArea rows={3} placeholder={t('placeholder.progressNote')} disabled={true} data-tour-id="drawer-progress-note" />
                  </Form.Item>
                  <Form.Item name="change_note" label={t('field.changeNote')}>
                    <Input.TextArea rows={2} placeholder={t('placeholder.changeNote')} disabled={true} data-tour-id="drawer-change-note" />
                  </Form.Item>
                </>
              )}

              <Space wrap className={editMode ? 'mt-4' : undefined}>
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
                              <Button size="small" type="text" icon={<DownloadOutlined style={{ fontSize: 14, color: '#fff' }} />} onClick={(e) => { e.stopPropagation(); handleDownload(item.token) }} />
                              <Button size="small" danger type="text" icon={<DeleteOutlined style={{ fontSize: 14 }} />} onClick={(e) => { e.stopPropagation(); onDeletePhoto?.(deleteRef) }} disabled={isFinalized} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Image.PreviewGroup>
              )}

              <Upload accept="image/*,video/*" showUploadList={false} multiple disabled={isFinalized || uploading} beforeUpload={beforeUploadCheck}>
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
                      if (status === 'uploading' || status === 'compressing') icon = <LoadingOutlined />
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
