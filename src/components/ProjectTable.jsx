import React, { useEffect, useMemo, useState } from 'react'
import { Table, Tag, Grid, Empty, Pagination, Popover, Checkbox, Button, Space, Divider, Tooltip } from 'antd'
import { SettingOutlined, ClearOutlined, RedoOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

export default function ProjectTable({ projects = [], loading, onRowClick, pagination }) {
  const screens = Grid.useBreakpoint()
  // Treat tablets (md) as mobile by switching to mobile layout until large breakpoint
  const isMobile = !screens.lg
  const { t } = useTranslation()

  // default page size
  const DEFAULT_PAGE_SIZE = 200
  const PAGE_SIZE_OPTIONS = ['50','100','200','500','1000','2000']

  // localStorage keys
  const LS_COLUMNS_KEY = 'projectTable.columns.v2'
  const LS_SORT_KEY = 'projectTable.sort.v2'

  // all possible column keys in stable order
  const allColumnKeys = useMemo(() => (
    ['project_code', 'name', 'address', 'sales_person', 'installer', 'start_date', 'end_date', 'glass', 'frame', 'purchase', 'transport', 'install', 'repair']
  ), [])

  // default visible columns = all
  const defaultVisible = allColumnKeys

  const [visibleKeys, setVisibleKeys] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_COLUMNS_KEY) : null
      const parsed = raw ? JSON.parse(raw) : null
      if (Array.isArray(parsed) && parsed.length) {
        // keep only known keys to be safe
        return parsed.filter(k => allColumnKeys.includes(k))
      }
    } catch (_) {}
    return [...defaultVisible]
  })

  const [sortState, setSortState] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_SORT_KEY) : null
      const parsed = raw ? JSON.parse(raw) : null
      if (parsed && (parsed.order === 'ascend' || parsed.order === 'descend') && allColumnKeys.includes(parsed.key)) {
        return parsed
      }
    } catch (_) {}
    return { key: null, order: null }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_COLUMNS_KEY, JSON.stringify(visibleKeys))
    } catch (_) {}
  }, [visibleKeys])

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_SORT_KEY, JSON.stringify(sortState))
    } catch (_) {}
  }, [sortState])

  // common string sorter helper
  const strSorter = (a, b, field) => String(a?.[field] || '').localeCompare(String(b?.[field] || ''))

  const renderStage = (record, key, remarkKey) => {
    const v = !!record?.stages?.[key]
    const remark = record?.stages?.[remarkKey] || ''
    const tag = <Tag color={v ? 'green' : 'default'}>{v ? t('common.yes') : t('common.no')}</Tag>
    return remark ? (
      <Tooltip title={remark}>{tag}</Tooltip>
    ) : tag
  }

  // define full columns definition list
  const allColumns = useMemo(() => ([
    { title: t('field.projectCode'), dataIndex: 'project_code', key: 'project_code', fixed: 'left', sorter: (a, b) => strSorter(a, b, 'project_code'), responsive: ['xs', 'sm', 'md', 'lg'] },
    { title: t('field.project'), dataIndex: 'name', key: 'name', sorter: (a, b) => strSorter(a, b, 'name'), responsive: ['xs', 'sm', 'md', 'lg'] },
    { title: t('field.address'), dataIndex: 'address', key: 'address', ellipsis: true, sorter: (a, b) => strSorter(a, b, 'address'), responsive: ['sm', 'md', 'lg'] },
    { title: t('field.salesPerson'), dataIndex: 'sales_person', key: 'sales_person', width: 120, sorter: (a, b) => strSorter(a, b, 'sales_person'), responsive: ['md', 'lg'] },
    { title: t('field.installer'), dataIndex: 'installer', key: 'installer', width: 120, sorter: (a, b) => strSorter(a, b, 'installer'), responsive: ['md', 'lg'] },
    { title: t('field.startDate'), dataIndex: 'start_date', key: 'start_date', width: 120, sorter: (a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0), render: v => v ? dayjs(v).format('YYYY-MM-DD') : '', responsive: ['xs', 'sm', 'md', 'lg'] },
    { title: t('field.endDate'), dataIndex: 'end_date', key: 'end_date', width: 120, sorter: (a, b) => new Date(a.end_date || 0) - new Date(b.end_date || 0), render: v => v ? dayjs(v).format('YYYY-MM-DD') : '', responsive: ['sm', 'md', 'lg'] },
    { title: t('stage.glass'), key: 'glass', dataIndex: 'stages', width: 90, render: (_, r) => renderStage(r, 'glass', 'glassRemark') },
    { title: t('stage.frame'), key: 'frame', dataIndex: 'stages', width: 90, render: (_, r) => renderStage(r, 'frame', 'frameRemark') },
    { title: t('stage.purchase'), key: 'purchase', dataIndex: 'stages', width: 90, render: (_, r) => renderStage(r, 'purchase', 'purchaseRemark') },
    { title: t('stage.transport'), key: 'transport', dataIndex: 'stages', width: 90, render: (_, r) => renderStage(r, 'transport', 'transportRemark') },
    { title: t('stage.install'), key: 'install', dataIndex: 'stages', width: 90, render: (_, r) => renderStage(r, 'install', 'installRemark') },
    { title: t('stage.repair'), key: 'repair', dataIndex: 'stages', width: 90, render: (_, r) => renderStage(r, 'repair', 'repairRemark') },
  ]), [t])

  // apply controlled sort order to columns
  const columns = useMemo(() => {
    return allColumns
      .map(col => ({
        ...col,
        sortOrder: sortState.key === col.key ? sortState.order : null,
      }))
      .filter(col => visibleKeys.includes(col.key))
  }, [allColumns, sortState, visibleKeys])

  // column selector content
  const selectorContent = (
    <div style={{ width: 240 }}>
      <Checkbox.Group
        style={{ width: '100%' }}
        value={visibleKeys}
        onChange={(vals) => {
          const arr = vals
          // prevent unselecting last column
          if (!arr.length) return
          // keep stable order according to allColumnKeys
          const ordered = allColumnKeys.filter(k => arr.includes(k))
          setVisibleKeys(ordered)
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {allColumns.map(c => (
            <Checkbox
              key={c.key}
              value={c.key}
              disabled={visibleKeys.length <= 1 && visibleKeys.includes(c.key)}
            >{typeof c.title === 'string' ? c.title : t(`field.${c.key}`)}</Checkbox>
          ))}
        </Space>
      </Checkbox.Group>
      <Divider style={{ margin: '8px 0' }} />
      <Space>
        <Button size="small" icon={<ClearOutlined />} onClick={() => setSortState({ key: null, order: null })}>{t('common.clear', 'Clear sort')}</Button>
        <Button size="small" icon={<RedoOutlined />} onClick={() => { setVisibleKeys([...defaultVisible]); setSortState({ key: null, order: null }) }}>{t('common.reset', 'Reset')}</Button>
      </Space>
    </div>
  )

  // handle table changes (pagination, filters, sorter)
  const handleTableChange = (pg, filters, sorter) => {
    // update controlled sort state
    const s = Array.isArray(sorter) ? sorter[0] : sorter
    if (s && s.field && s.order) {
      setSortState({ key: s.columnKey || s.field, order: s.order })
    } else if (!s || !s.order) {
      setSortState({ key: null, order: null })
    }

    // forward pagination changes to external controller if provided
    if (pg && (pg.current !== pagination?.page || pg.pageSize !== pagination?.pageSize)) {
      pagination?.onChange?.(pg.current, pg.pageSize)
    }
  }

  if (isMobile) {
    if (loading) {
      // Keep Table's loading state behavior consistent
      return (
        <Table
          size="small"
          rowKey={r => r.id}
          columns={columns}
          dataSource={[]}
          loading={true}
          pagination={false}
        />
      )
    }
    if (!projects?.length) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noData')} />
    }
    return (
      <div className="flex flex-col gap-3">
        {projects.map(p => {
          const start = p.start_date ? dayjs(p.start_date).format('YYYY-MM-DD') : '-'
          const end = p.end_date ? dayjs(p.end_date).format('YYYY-MM-DD') : '-'
          const st = p.stages || {}
          const done = ['repair','install','transport','purchase','frame','glass'].filter(k => !!st[k])
            .sort((a,b) => ['repair','install','transport','purchase','frame','glass'].indexOf(a) - ['repair','install','transport','purchase','frame','glass'].indexOf(b))
          const chips = done.slice(0, 2).map(k => t(`stage.${k}`)).join('、') || '-'
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onRowClick?.(p.id)}
              className="text-left bg-white rounded border p-3 active:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-base">{p.project_code} · {p.name}</div>
                <div className="text-xs text-slate-600">{chips}</div>
              </div>
              {p.address ? (
                <div className="text-xs text-slate-500 mt-1">{p.address}</div>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">{t('field.salesPerson')}：</span>{p.sales_person || '-'}</div>
                <div><span className="text-slate-500">{t('field.installer')}：</span>{p.installer || '-'}</div>
                <div><span className="text-slate-500">{t('field.startDate')}：</span>{start}</div>
                <div><span className="text-slate-500">{t('field.endDate')}：</span>{end}</div>
              </div>
            </button>
          )
        })}
        <div className="flex justify-center py-2">
          <Pagination
            size="small"
            current={pagination?.page}
            pageSize={pagination?.pageSize || DEFAULT_PAGE_SIZE}
            total={pagination?.total}
            showSizeChanger={true}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onChange={(page, pageSize) => pagination?.onChange?.(page, pageSize)}
          />
        </div>
      </div>
    )
  }

  return (
    <Table
      size="small"
      rowKey={r => r.id}
      columns={columns}
      dataSource={projects}
      loading={loading}
      title={() => (
        <div className="flex justify-end">
          <Popover placement="left" trigger="click" content={selectorContent}>
            <Button size="small" icon={<SettingOutlined />}>{t('common.columns', 'Columns')}</Button>
          </Popover>
        </div>
      )}
      pagination={{
        current: pagination?.page,
        pageSize: pagination?.pageSize || DEFAULT_PAGE_SIZE,
        total: pagination?.total,
        showSizeChanger: true,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        onChange: pagination?.onChange,
      }}
      onChange={handleTableChange}
      onRow={(record) => ({ onClick: () => onRowClick?.(record.id) })}
      scroll={{ x: 1000 }}
    />
  )
}
