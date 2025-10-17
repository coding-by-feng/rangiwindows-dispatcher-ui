import React from 'react'
import { Table, Tag, Grid, Empty, Pagination } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

export default function ProjectTable({ projects = [], loading, onRowClick, pagination }) {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm
  const { t } = useTranslation()

  const normalizeStatus = (s) => {
    if (!s) return s
    if (s === '未开始') return 'not_started'
    if (s === '施工中') return 'in_progress'
    if (s === '完成') return 'completed'
    return s
  }
  const statusColor = (codeRaw) => {
    const code = normalizeStatus(codeRaw)
    return code === 'completed' ? 'green' : code === 'in_progress' ? 'blue' : 'default'
  }
  const statusText = (raw) => {
    const code = normalizeStatus(raw)
    if (code === 'not_started' || code === 'in_progress' || code === 'completed') {
      return t(`status.${code}`)
    }
    return raw || '-'
  }

  const columns = [
    { title: t('field.projectCode'), dataIndex: 'project_code', key: 'project_code', fixed: 'left', sorter: (a, b) => String(a.project_code || '').localeCompare(String(b.project_code || '')), responsive: ['xs', 'sm', 'md', 'lg'] },
    { title: t('field.project'), dataIndex: 'name', key: 'name', sorter: (a, b) => String(a.name || '').localeCompare(String(b.name || '')), responsive: ['xs', 'sm', 'md', 'lg'] },
    { title: t('field.address'), dataIndex: 'address', key: 'address', ellipsis: true, responsive: ['sm', 'md', 'lg'] },
    { title: t('field.salesPerson'), dataIndex: 'sales_person', key: 'sales_person', width: 120, responsive: ['md', 'lg'] },
    { title: t('field.installer'), dataIndex: 'installer', key: 'installer', width: 120, responsive: ['md', 'lg'] },
    { title: t('field.startDate'), dataIndex: 'start_date', key: 'start_date', width: 120, sorter: (a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0), render: v => v ? dayjs(v).format('YYYY-MM-DD') : '', responsive: ['xs', 'sm', 'md', 'lg'] },
    { title: t('field.endDate'), dataIndex: 'end_date', key: 'end_date', width: 120, sorter: (a, b) => new Date(a.end_date || 0) - new Date(b.end_date || 0), render: v => v ? dayjs(v).format('YYYY-MM-DD') : '', responsive: ['sm', 'md', 'lg'] },
    {
      title: t('field.status'), dataIndex: 'status', key: 'status', width: 100, responsive: ['xs', 'sm', 'md', 'lg'],
      filters: [
        { text: t('status.not_started'), value: 'not_started' },
        { text: t('status.in_progress'), value: 'in_progress' },
        { text: t('status.completed'), value: 'completed' },
      ],
      onFilter: (val, record) => normalizeStatus(record.status) === val,
      render: (v) => (
        <Tag color={statusColor(v)}>{statusText(v)}</Tag>
      )
    },
  ]

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
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onRowClick?.(p.id)}
              className="text-left bg-white rounded border p-3 active:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-base">{p.project_code} · {p.name}</div>
                <Tag color={statusColor(p.status)}>{statusText(p.status)}</Tag>
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
            pageSize={pagination?.pageSize}
            total={pagination?.total}
            showSizeChanger={false}
            onChange={pagination?.onChange}
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
      pagination={{
        current: pagination?.page,
        pageSize: pagination?.pageSize || 10,
        total: pagination?.total,
        showSizeChanger: false,
        onChange: pagination?.onChange,
      }}
      onRow={(record) => ({ onClick: () => onRowClick?.(record.id) })}
      scroll={{ x: 800 }}
    />
  )
}
