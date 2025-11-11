import React from 'react'
import { Table, Tag, Grid, Empty, Pagination } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { normalizeStatus } from '../utils/status'

export default function ProjectTable({ projects = [], loading, onRowClick, pagination }) {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm
  const { t } = useTranslation()

  const statusColor = (codeRaw) => {
    const code = normalizeStatus(codeRaw)
    switch (code) {
      case 'final_payment_received':
        return 'green'
      case 'doors_windows_installed':
        return 'blue'
      case 'doors_windows_delivered':
        return 'cyan'
      case 'doors_windows_produced':
        return 'gold'
      case 'glass_ordered':
      default:
        return 'default'
    }
  }
  const statusText = (raw) => {
    const code = normalizeStatus(raw)
    const allowed = ['glass_ordered', 'doors_windows_produced', 'doors_windows_delivered', 'doors_windows_installed', 'final_payment_received']
    if (allowed.includes(code)) return t(`status.${code}`)
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
      title: t('field.status'), dataIndex: 'status', key: 'status', width: 160, responsive: ['xs', 'sm', 'md', 'lg'],
      filters: [
        { text: t('status.glass_ordered'), value: 'glass_ordered' },
        { text: t('status.doors_windows_produced'), value: 'doors_windows_produced' },
        { text: t('status.doors_windows_delivered'), value: 'doors_windows_delivered' },
        { text: t('status.doors_windows_installed'), value: 'doors_windows_installed' },
        { text: t('status.final_payment_received'), value: 'final_payment_received' },
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
