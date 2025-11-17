import React from 'react'
import { Form, Input, DatePicker, Grid } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * ProjectFormFields - shared fields block for creating/editing a project
 *
 * Props:
 * - disabled?: boolean - disable inputs (e.g., when project is completed)
 * - showNotes?: boolean - whether to show the progress_note field
 * - onStatusChange?: (value: string) => void - legacy; no-op
 * - layout?: 'one-column' | 'two-column' (default: 'two-column') - controls grid layout
 * - withValidation?: boolean (default: true) - toggles required rules and asterisk marks
 */
export default function ProjectFormFields({ disabled = false, showNotes = true, onStatusChange, layout = 'two-column', withValidation = true }) {
  const { t } = useTranslation()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm

  const gridClass = layout === 'two-column' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'

  const req = (msg) => (withValidation ? [{ required: true, message: msg }] : [])

  const ids = React.useMemo(() => ({
    name: 'pff-name',
    address: 'pff-address',
    clientName: 'pff-client-name',
    sales: 'pff-sales-person',
    installer: 'pff-installer',
    team: 'pff-team-members',
    today: 'pff-today-task',
    note: 'pff-progress-note',
    changeNote: 'pff-change-note',
  }), [])

  return (
    <div className={gridClass}>
      <Form.Item required={false} name="name" label={<label htmlFor={ids.name}>{t('field.projectName')}</label>} rules={req(t('validation.requiredProjectName'))}>
        <Input id={ids.name} aria-label={t('field.projectName')} placeholder={t('placeholder.projectName')} disabled={disabled} data-tour-id="pff-name" />
      </Form.Item>

      <Form.Item required={false} name="address" label={<label htmlFor={ids.address}>{t('field.address')}</label>} rules={req(t('validation.requiredAddress'))} className={layout === 'two-column' ? 'sm:col-span-2' : ''}>
        <Input id={ids.address} aria-label={t('field.address')} placeholder={t('placeholder.address')} disabled={disabled} data-tour-id="pff-address" />
      </Form.Item>

      <Form.Item required={false} name="client_name" label={<label htmlFor={ids.clientName}>{t('field.clientName')}</label>} rules={req(t('validation.requiredClientName'))}>
        <Input id={ids.clientName} aria-label={t('field.clientName')} disabled={disabled} data-tour-id="pff-client-name" />
      </Form.Item>

      <Form.Item required={false} name="sales_person" label={<label htmlFor={ids.sales}>{t('field.salesPerson')}</label>} rules={req(t('validation.requiredSalesPerson'))}>
        <Input id={ids.sales} aria-label={t('field.salesPerson')} placeholder={t('placeholder.salesPerson')} disabled={disabled} data-tour-id="pff-sales-person" />
      </Form.Item>

      <Form.Item required={false} name="installer" label={<label htmlFor={ids.installer}>{t('field.installer')}</label>} rules={req(t('validation.requiredInstaller'))}>
        <Input id={ids.installer} aria-label={t('field.installer')} placeholder={t('placeholder.installer')} disabled={disabled} data-tour-id="pff-installer" />
      </Form.Item>

      <Form.Item name="team_members" label={<label htmlFor={ids.team}>{t('field.teamMembers')}</label>} className={layout === 'two-column' ? 'sm:col-span-2' : ''}>
        <Input id={ids.team} aria-label={t('field.teamMembers')} placeholder={t('placeholder.teamMembers')} disabled={disabled} data-tour-id="pff-team-members" />
      </Form.Item>

      <Form.Item required={false} name="dates" label={t('field.dateRange')} rules={req(t('validation.requiredDates'))} className={layout === 'two-column' ? 'sm:col-span-2' : ''}>
        {/* Optimized: single-month popup on mobile */}
        <DatePicker.RangePicker
          format="YYYY-MM-DD"
          className="w-full"
          getPopupContainer={() => document.body}
          placement="topLeft"
          classNames={isMobile ? { popup: 'mobile-single-month-picker' } : undefined}
          data-tour-id="pff-dates"
        />
      </Form.Item>

      <Form.Item name="today_task" label={<label htmlFor={ids.today}>{t('field.todayTask')}</label>} className={layout === 'two-column' ? 'sm:col-span-2' : ''}>
        <Input.TextArea id={ids.today} aria-label={t('field.todayTask')} rows={2} placeholder={t('placeholder.todayTask')} disabled={disabled} data-tour-id="pff-today-task" />
      </Form.Item>

      {showNotes && (
        <Form.Item name="progress_note" label={<label htmlFor={ids.note}>{t('field.progressNote')}</label>} className={layout === 'two-column' ? 'sm:col-span-2' : ''}>
          <Input.TextArea id={ids.note} aria-label={t('field.progressNote')} rows={3} placeholder={t('placeholder.progressNote')} disabled={disabled} data-tour-id="pff-progress-note" />
        </Form.Item>
      )}

      {showNotes && (
        <Form.Item name="change_note" label={<label htmlFor={ids.changeNote}>{t('field.changeNote')}</label>} className={layout === 'two-column' ? 'sm:col-span-2' : ''}>
          <Input.TextArea id={ids.changeNote} aria-label={t('field.changeNote')} rows={3} placeholder={t('placeholder.changeNote')} disabled={disabled} data-tour-id="pff-change-note" />
        </Form.Item>
      )}
    </div>
  )
}
