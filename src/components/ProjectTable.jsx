import React from 'react'
import { Table, Tag, Grid, Empty } from 'antd'
import dayjs from 'dayjs'

export default function ProjectTable({ projects = [], loading, onRowClick }) {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm

  const columns = [
    { title: '项目编号', dataIndex: 'project_code', key: 'project_code', fixed: 'left', sorter: (a, b) => String(a.project_code || '').localeCompare(String(b.project_code || '')), responsive: ['xs', 'sm', 'md', 'lg'] },
    { title: '项目名', dataIndex: 'name', key: 'name', sorter: (a, b) => String(a.name || '').localeCompare(String(b.name || '')), responsive: ['xs', 'sm', 'md', 'lg'] },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true, responsive: ['sm', 'md', 'lg'] },
    { title: '销售负责人', dataIndex: 'sales_person', key: 'sales_person', width: 120, responsive: ['md', 'lg'] },
    { title: '安装负责人', dataIndex: 'installer', key: 'installer', width: 120, responsive: ['md', 'lg'] },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date', width: 120, sorter: (a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0), render: v => v ? dayjs(v).format('YYYY-MM-DD') : '', responsive: ['xs', 'sm', 'md', 'lg'] },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date', width: 120, sorter: (a, b) => new Date(a.end_date || 0) - new Date(b.end_date || 0), render: v => v ? dayjs(v).format('YYYY-MM-DD') : '', responsive: ['sm', 'md', 'lg'] },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100, responsive: ['xs', 'sm', 'md', 'lg'],
      filters: [
        { text: '未开始', value: '未开始' },
        { text: '施工中', value: '施工中' },
        { text: '完成', value: '完成' },
      ],
      onFilter: (val, record) => record.status === val,
      render: (v) => {
        const color = v === '完成' ? 'green' : v === '施工中' ? 'blue' : 'default'
        return <Tag color={color}>{v || '-'}</Tag>
      }
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
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
    }
    return (
      <div className="flex flex-col gap-3">
        {projects.map(p => {
          const start = p.start_date ? dayjs(p.start_date).format('YYYY-MM-DD') : '-'
          const end = p.end_date ? dayjs(p.end_date).format('YYYY-MM-DD') : '-'
          const statusColor = p.status === '完成' ? 'green' : p.status === '施工中' ? 'blue' : 'default'
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onRowClick?.(p.id)}
              className="text-left bg-white rounded border p-3 active:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-base">{p.project_code} · {p.name}</div>
                <Tag color={statusColor}>{p.status || '-'}</Tag>
              </div>
              {p.address ? (
                <div className="text-xs text-slate-500 mt-1">{p.address}</div>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">销售：</span>{p.sales_person || '-'}</div>
                <div><span className="text-slate-500">安装：</span>{p.installer || '-'}</div>
                <div><span className="text-slate-500">开始：</span>{start}</div>
                <div><span className="text-slate-500">结束：</span>{end}</div>
              </div>
            </button>
          )
        })}
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
      pagination={{ pageSize: 10, showSizeChanger: false }}
      onRow={(record) => ({ onClick: () => onRowClick?.(record.id) })}
      scroll={{ x: 800 }}
    />
  )
}
