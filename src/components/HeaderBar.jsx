import React from 'react'
import { Button, Input, Space, Typography, Select, Switch, Checkbox, Dropdown } from 'antd'
import { FileExcelOutlined, PlusOutlined, DownOutlined, UpOutlined, QuestionCircleOutlined, FilterOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Title } = Typography

export default function HeaderBar({ onSearch, onAdd, onExportExcel, status, onStatusChange, stages = [], onStagesChange, includeArchived = false, onToggleIncludeArchived, mode, onModeChange, onSeedDemo, lang, onLangChange, exportExcelLoading = false, onStartTour, seedLoading = false, location, onLocationChange, weatherTypes = [], onWeatherTypesChange, compressMedia = true, onToggleCompressMedia }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = React.useState(true)

  const baseStageOptions = React.useMemo(() => ([
    { label: t('stage.glass'), value: 'glass' },
    { label: t('stage.frame'), value: 'frame' },
    { label: t('stage.purchase'), value: 'purchase' },
    { label: t('stage.transport'), value: 'transport' },
    { label: t('stage.install'), value: 'install' },
    { label: t('stage.repair'), value: 'repair' },
  ]), [t])

  // Selected items should appear at the top
  const stageOptions = React.useMemo(() => {
    const sel = new Set(Array.isArray(stages) ? stages : [])
    const selected = baseStageOptions.filter(o => sel.has(o.value))
    const unselected = baseStageOptions.filter(o => !sel.has(o.value))
    return [...selected, ...unselected]
  }, [baseStageOptions, stages])

  const stageMenu = (
    <div
      className="p-2 bg-white rounded shadow-lg border"
      style={{ width: 240, background: '#ffffff' }}
    >
      <Checkbox.Group
        className="w-full"
        value={stages}
        onChange={(vals) => onStagesChange?.(vals)}
      >
        <div className="grid grid-cols-2 gap-2">
          {stageOptions.map(opt => (
            <Checkbox key={opt.value} value={opt.value}>{opt.label}</Checkbox>
          ))}
        </div>
      </Checkbox.Group>
    </div>
  )

  return (
    <div className="w-full bg-white border-b px-3 sm:px-4 py-3 sticky top-0 z-10">
      {/* Row 1: Logo + Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-cyan-600 text-white rounded flex items-center justify-center font-bold">RW</div>
        <Title level={4} style={{ margin: 0 }} className="!text-base sm:!text-xl">{t('app.title')}</Title>
      </div>

      {/* Row 2: Controls + Actions (collapsible) */}
      <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
        {expanded && (
          <>
            {/* Location */}
            <Select
              className="w-36 sm:w-40"
              value={location}
              onChange={onLocationChange}
              data-tour-id="location-select"
              options={[
                { label: t('location.auckland'), value: 'auckland' },
                { label: t('location.wellington'), value: 'wellington' },
                { label: t('location.christchurch'), value: 'christchurch' },
              ]}
            />
            {/* Weather Signals */}
            <Select
              mode="multiple"
              maxTagCount={2}
              allowClear
              className="w-48 sm:w-52"
              value={weatherTypes}
              onChange={onWeatherTypesChange}
              placeholder={t('label.weatherSignals')}
              data-tour-id="weather-types-select"
              options={[
                { label: t('weather.signal.probability'), value: 'prob' },
                { label: t('weather.signal.rainfall'), value: 'rain' },
                { label: t('weather.signal.temperature'), value: 'temp' },
              ]}
            />
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

            {/* Search + Stage Filters */}
            <Input.Search allowClear placeholder={t('search.placeholder')} onSearch={onSearch} className="w-full sm:w-80" data-tour-id="search-input" />

            <Dropdown
              trigger={["click"]}
              dropdownRender={() => stageMenu}
              overlayStyle={{ zIndex: 2000 }}
              getPopupContainer={() => document.body}
              placement="bottomLeft"
            >
              <Button icon={<FilterOutlined />} data-tour-id="stage-filter">
                {t('filter.stages')}
                {Array.isArray(stages) && stages.length > 0 ? ` (${stages.length})` : ''}
              </Button>
            </Dropdown>

            <div className="flex items-center gap-1" data-tour-id="archived-toggle">
              <Switch size="small" checked={includeArchived} onChange={onToggleIncludeArchived} />
              <span className="text-xs text-slate-600">{t('label.showArchived')}</span>
            </div>
            {/* Compression toggle */}
            <div className="flex items-center gap-1" data-tour-id="compress-toggle" aria-hidden>
              <Switch size="small" checked={compressMedia} onChange={onToggleCompressMedia} aria-hidden />
              <span className="text-xs text-slate-600" aria-hidden>{t('label.compressMedia')}</span>
            </div>
            {/* Actions */}
            <Space wrap size={[8, 8]}>
              <Button icon={<FileExcelOutlined />} onClick={onExportExcel} loading={exportExcelLoading} data-tour-id="export-excel">{t('btn.exportExcel')}</Button>
              {mode === 'local' && (
                <Button onClick={onSeedDemo} loading={seedLoading} data-tour-id="seed-demo">{t('btn.seedAkl')}</Button>
              )}
              <Button icon={<QuestionCircleOutlined />} onClick={onStartTour} data-tour-id="start-tour">{t('btn.tour')}</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} data-tour-id="add-project">{t('btn.addProject')}</Button>
            </Space>
          </>
        )}
        {/* Collapse / Expand toggle (always at the end) */}
        <Button onClick={() => setExpanded(e => !e)} icon={expanded ? <UpOutlined /> : <DownOutlined />} data-tour-id="more-toggle">
          {expanded ? t('btn.collapse') : t('btn.more')}
        </Button>
      </div>
    </div>
  )
}
