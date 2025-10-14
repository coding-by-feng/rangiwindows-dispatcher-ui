import React from 'react'
import { Table, Tag } from 'antd'
import dayjs from 'dayjs'

export default function ProjectTable({ projects = [], loading, onRowClick }) {
  const columns = [
    { title: '项目编号', dataIndex: 'project_code', key: 'project_code', sorter: (a, b) => String(a.project_code || '').localeCompare(String(b.project_code || '')) },
    { title: '项目名', dataIndex: 'name', key: 'name', sorter: (a, b) => String(a.name || '').localeCompare(String(b.name || '')) },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    { title: '销售负责人', dataIndex: 'sales_person', key: 'sales_person', width: 120 },
    { title: '安装负责人', dataIndex: 'installer', key: 'installer', width: 120 },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date', width: 120, sorter: (a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0), render: v => v ? dayjs(v).format('YYYY-MM-DD') : '' },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date', width: 120, sorter: (a, b) => new Date(a.end_date || 0) - new Date(b.end_date || 0), render: v => v ? dayjs(v).format('YYYY-MM-DD') : '' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
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

  return (
    <Table
      size="middle"
      rowKey={r => r.id}
      columns={columns}
      dataSource={projects}
      loading={loading}
      pagination={{ pageSize: 10, showSizeChanger: false }}
      onRow={(record) => ({ onClick: () => onRowClick?.(record.id) })}
    />
  )
}

