import React from 'react'
import { Button, Input, Space, Typography, Select, Switch } from 'antd'
import { FileExcelOutlined, PlusOutlined, DownOutlined, UpOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Title } = Typography

export default function HeaderBar({ onSearch, onAdd, onExportExcel, status, onStatusChange, includeArchived = false, onToggleIncludeArchived, mode, onModeChange, onSeedDemo, lang, onLangChange, exportExcelLoading = false, onStartTour, seedLoading = false }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = React.useState(true)

  return (
    <div className="w-full bg-white border-b px-3 sm:px-4 py-3 sticky top-0 z-10">
      {/* Row 1: Logo + Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-cyan-600 text-white rounded flex items-center justify-center font-bold">RW</div>
        <Title level={4} style={{ margin: 0 }} className="!text-base sm:!text-xl">{t('app.title')}</Title>
      </div>

      {/* Row 2: All controls and buttons */}
      <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Mode + Lang */}
        <Select
          className="w-40 sm:w-44"
          value={mode}
          onChange={onModeChange}
          data-tour-id="mode-select"
          options={[
            { label: t('mode.local'), value: 'local' },
            { label: t('mode.backendTest'), value: 'backend-test' },
            { label: t('mode.backendProd'), value: 'backend-prod' },
          ]}
        />
        <Select
          className="w-36 sm:w-40"
          value={lang}
          onChange={onLangChange}
          data-tour-id="lang-select"
          options={[
            { label: t('lang.zh-CN'), value: 'zh-CN' },
            { label: t('lang.en'), value: 'en' },
            { label: t('lang.zh-TW'), value: 'zh-TW' },
          ]}
        />

        {/* Search + Filters */}
        <Input.Search allowClear placeholder={t('search.placeholder')} onSearch={onSearch} className="w-full sm:w-80" data-tour-id="search-input" />
        <Select
          allowClear
          placeholder={t('filter.status')}
          className="w-full sm:w-32"
          value={status}
          onChange={onStatusChange}
          data-tour-id="status-filter"
          options={[
            { label: t('status.not_started'), value: 'not_started' },
            { label: t('status.in_progress'), value: 'in_progress' },
            { label: t('status.completed'), value: 'completed' },
          ]}
        />
        <div className="flex items-center gap-1" data-tour-id="archived-toggle">
          <Switch size="small" checked={includeArchived} onChange={onToggleIncludeArchived} />
          <span className="text-xs text-slate-600">{t('label.showArchived')}</span>
        </div>

        {/* Actions */}
        <Space wrap size={[8, 8]}>
          {expanded && (
            <>
              <Button icon={<FileExcelOutlined />} onClick={onExportExcel} loading={exportExcelLoading} data-tour-id="export-excel">{t('btn.exportExcel')}</Button>
              {mode === 'local' && (
                <Button onClick={onSeedDemo} loading={seedLoading} data-tour-id="seed-demo">{t('btn.seedAkl')}</Button>
              )}
            </>
          )}
          <Button onClick={() => setExpanded(e => !e)} icon={expanded ? <UpOutlined /> : <DownOutlined />} data-tour-id="more-toggle">
            {expanded ? t('btn.collapse') : t('btn.more')}
          </Button>
          <Button icon={<QuestionCircleOutlined />} onClick={onStartTour} data-tour-id="start-tour">{t('btn.tour')}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} data-tour-id="add-project">{t('btn.addProject')}</Button>
        </Space>
      </div>
    </div>
  )
}
