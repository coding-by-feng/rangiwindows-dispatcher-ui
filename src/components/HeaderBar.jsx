import React from 'react'
import { Button, Input, Space, Typography, Select, Switch } from 'antd'
import { FileExcelOutlined, FilePdfOutlined, PlusOutlined } from '@ant-design/icons'

const { Title } = Typography

export default function HeaderBar({ onSearch, onAdd, onExportExcel, onExportPDF, status, onStatusChange, includeArchived = false, onToggleIncludeArchived }) {
  return (
    <div className="w-full bg-white border-b px-3 sm:px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-cyan-600 text-white rounded flex items-center justify-center font-bold">RW</div>
        <Title level={4} style={{ margin: 0 }} className="!text-base sm:!text-xl">Rangi Windows 施工安排系统</Title>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <Input.Search allowClear placeholder="搜索项目/客户/地址" onSearch={onSearch} className="w-full sm:w-80" />
        <Select
          allowClear
          placeholder="状态筛选"
          className="w-full sm:w-32"
          value={status}
          onChange={onStatusChange}
          options={[
            { label: '未开始', value: '未开始' },
            { label: '施工中', value: '施工中' },
            { label: '完成', value: '完成' },
          ]}
        />
        <div className="flex items-center gap-1">
          <Switch size="small" checked={includeArchived} onChange={onToggleIncludeArchived} />
          <span className="text-xs text-slate-600">显示归档</span>
        </div>
        <Space wrap>
          <Button icon={<FileExcelOutlined />} onClick={onExportExcel}>导出Excel</Button>
          <Button icon={<FilePdfOutlined />} onClick={onExportPDF}>导出PDF</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>新增项目</Button>
        </Space>
      </div>
    </div>
  )
}
