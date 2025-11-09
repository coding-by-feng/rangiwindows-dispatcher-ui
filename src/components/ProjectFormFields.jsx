import React from 'react'
import { Form, Input, DatePicker, Select, Grid, Radio } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * ProjectFormFields - shared fields block for creating/editing a project
 *
 * Props:
 * - disabled?: boolean - disable inputs (e.g., when project is completed)
 * - showNotes?: boolean - whether to show the progress_note field
 * - onStatusChange?: (value: string) => void - callback when status changes (used to toggle notes in Drawer)
 * - layout?: 'one-column' | 'two-column' (default: 'two-column') - controls grid layout
 * - withValidation?: boolean (default: true) - toggles required rules and asterisk marks
 */
export default function ProjectFormFields({ disabled = false, showNotes = true, onStatusChange, layout = 'two-column', withValidation = true }) {
  const { t } = useTranslation()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm

  const gridClass = layout === 'two-column' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'

  const statusOptions = [
    { label: t('status.not_started'), value: 'not_started' },
    { label: t('status.in_progress'), value: 'in_progress' },
    { label: t('status.completed'), value: 'completed' },
  ]

  const req = (msg) => (withValidation ? [{ required: true, message: msg }] : [])

  const ids = React.useMemo(() => ({
    name: 'pff-name',
    address: 'pff-address',
    clientName: 'pff-client-name',
    clientPhone: 'pff-client-phone',
    sales: 'pff-sales-person',
    installer: 'pff-installer',
    team: 'pff-team-members',
    status: 'pff-status',
    today: 'pff-today-task',
    note: 'pff-progress-note',
    glassOrdered: 'pff-glass-ordered',
    glassManufactured: 'pff-glass-manufactured',
  }), [])

  // Access form instance to watch dependencies
  const form = Form.useFormInstance?.()
  const glassOrderedVal = Form.useWatch ? Form.useWatch('glass_ordered', form) : undefined
  const isGlassOrdered = !!glassOrderedVal

  React.useEffect(() => {
    if (!isGlassOrdered && form) {
      // Ensure manufactured flag resets if ordered is turned off
      const current = form.getFieldValue('glass_manufactured')
      if (current) form.setFieldsValue({ glass_manufactured: false })
    }
  }, [isGlassOrdered, form])

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

      <Form.Item required={false} name="client_phone" label={<label htmlFor={ids.clientPhone}>{t('field.clientPhone')}</label>} rules={req(t('validation.requiredClientPhone'))}>
        <Input id={ids.clientPhone} aria-label={t('field.clientPhone')} disabled={disabled} data-tour-id="pff-client-phone" />
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
          aria-label={t('field.dateRange')}
          format="YYYY-MM-DD"
          className="w-full"
          getPopupContainer={() => document.body}
          placement="topLeft"
          classNames={isMobile ? { popup: 'mobile-single-month-picker' } : undefined}
          data-tour-id="pff-dates"
        />
      </Form.Item>

      <Form.Item name="status" label={t('field.status')}>
        <Select aria-label={t('field.status')} disabled={disabled} options={statusOptions} onChange={onStatusChange} getPopupContainer={() => document.body} data-tour-id="pff-status" />
      </Form.Item>

      {/* Glass workflow flags - same row */}
      <div className={layout === 'two-column' ? 'sm:col-span-2' : ''}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Form.Item name="glass_ordered" label={<label htmlFor={ids.glassOrdered}>{t('field.glassOrdered')}</label>} extra={t('help.glassOrdered')}>
            <Radio.Group id={ids.glassOrdered} aria-label={t('field.glassOrdered')} disabled={disabled} optionType="button" buttonStyle="solid" data-tour-id="pff-glass-ordered">
              <Radio value={true}>{t('common.yes')}</Radio>
              <Radio value={false}>{t('common.no')}</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="glass_manufactured" label={<label htmlFor={ids.glassManufactured}>{t('field.glassManufactured')}</label>} extra={t('help.glassManufactured')}>
            <Radio.Group id={ids.glassManufactured} aria-label={t('field.glassManufactured')} disabled={disabled || !isGlassOrdered} optionType="button" buttonStyle="solid" data-tour-id="pff-glass-manufactured">
              <Radio value={true}>{t('common.yes')}</Radio>
              <Radio value={false}>{t('common.no')}</Radio>
            </Radio.Group>
          </Form.Item>
        </div>
      </div>

      <Form.Item name="today_task" label={<label htmlFor={ids.today}>{t('field.todayTask')}</label>} className={layout === 'two-column' ? 'sm:col-span-2' : ''}>
        <Input.TextArea id={ids.today} aria-label={t('field.todayTask')} rows={2} placeholder={t('placeholder.todayTask')} disabled={disabled} data-tour-id="pff-today-task" />
      </Form.Item>

      {showNotes && (
        <Form.Item name="progress_note" label={<label htmlFor={ids.note}>{t('field.progressNote')}</label>} className={layout === 'two-column' ? 'sm:col-span-2' : ''}>
          <Input.TextArea id={ids.note} aria-label={t('field.progressNote')} rows={3} placeholder={t('placeholder.progressNote')} disabled={disabled} data-tour-id="pff-progress-note" />
        </Form.Item>
      )}
    </div>
  )
}
