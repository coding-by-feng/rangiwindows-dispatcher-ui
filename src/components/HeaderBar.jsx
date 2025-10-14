import React from 'react'
import { Button, Input, Space, Typography, Select } from 'antd'
import { FileExcelOutlined, FilePdfOutlined, PlusOutlined } from '@ant-design/icons'

const { Title } = Typography

export default function HeaderBar({ onSearch, onAdd, onExportExcel, onExportPDF, status, onStatusChange }) {
  return (
    <div className="w-full bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-cyan-600 text-white rounded flex items-center justify-center font-bold">RW</div>
        <Title level={4} style={{ margin: 0 }}>Rangi Windows 施工安排系统</Title>
      </div>
      <div className="flex items-center gap-3">
        <Input.Search allowClear placeholder="搜索项目/客户/地址" onSearch={onSearch} className="w-80" />
        <Select
          allowClear
          placeholder="状态筛选"
          className="w-32"
          value={status}
          onChange={onStatusChange}
          options={[
            { label: '未开始', value: '未开始' },
            { label: '施工中', value: '施工中' },
            { label: '完成', value: '完成' },
          ]}
        />
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={onExportExcel}>导出Excel</Button>
          <Button icon={<FilePdfOutlined />} onClick={onExportPDF}>导出PDF</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>新增项目</Button>
        </Space>
      </div>
    </div>
  )
}

