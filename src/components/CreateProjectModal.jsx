import React from 'react'
import { Modal, Form, Input, DatePicker, Select, Grid } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

export default function CreateProjectModal({ open, onCancel, onOk, confirmLoading = false }) {
  const [form] = Form.useForm()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm
  const { t } = useTranslation()

  const handleOk = async () => {
    const values = await form.validateFields()
    const start_date = values.dates?.[0] ? dayjs(values.dates[0]).format('YYYY-MM-DD') : ''
    const end_date = values.dates?.[1] ? dayjs(values.dates[1]).format('YYYY-MM-DD') : ''
    const payload = {
      name: values.name,
      client_name: values.client_name,
      client_phone: values.client_phone,
      address: values.address,
      sales_person: values.sales_person,
      installer: values.installer,
      team_members: values.team_members,
      start_date,
      end_date,
      status: values.status || 'not_started',
      today_task: values.today_task || '',
      progress_note: values.progress_note || '',
    }
    await onOk?.(payload)
    form.resetFields()
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel?.()
  }

  return (
      <Modal
          title={t('modal.create.title')}
          open={open}
          onOk={handleOk}
          onCancel={handleCancel}
          okText={t('modal.create.ok')}
          confirmLoading={confirmLoading}
          width={isMobile ? '100%' : 720}
          styles={{ body: { padding: isMobile ? 12 : 24 } }}
          destroyOnHidden
      >
        <Form
            form={form}
            layout="vertical"
            initialValues={{ status: 'not_started' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item name="name" label={t('field.projectName')} rules={[{ required: true, message: t('validation.requiredProjectName') }]}>
              <Input placeholder={t('placeholder.projectName')} />
            </Form.Item>
            <Form.Item name="address" label={t('field.address')} rules={[{ required: true, message: t('validation.requiredAddress') }]} className="sm:col-span-2">
              <Input placeholder={t('placeholder.address')} />
            </Form.Item>
            <Form.Item name="client_name" label={t('field.clientName')} rules={[{ required: true, message: t('validation.requiredClientName') }]}>
              <Input />
            </Form.Item>
            <Form.Item name="client_phone" label={t('field.clientPhone')} rules={[{ required: true, message: t('validation.requiredClientPhone') }]}>
              <Input />
            </Form.Item>
            <Form.Item name="sales_person" label={t('field.salesPerson')} rules={[{ required: true, message: t('validation.requiredSalesPerson') }]}>
              <Input placeholder={t('placeholder.salesPerson')} />
            </Form.Item>
            <Form.Item name="installer" label={t('field.installer')} rules={[{ required: true, message: t('validation.requiredInstaller') }]}>
              <Input placeholder={t('placeholder.installer')} />
            </Form.Item>
            <Form.Item name="team_members" label={t('field.teamMembers')} className="sm:col-span-2">
              <Input placeholder={t('placeholder.teamMembers')} />
            </Form.Item>
            <Form.Item name="dates" label={t('field.dateRange')} rules={[{ required: true, message: t('validation.requiredDates') }]} className="sm:col-span-2">
              {/* Show only 1 month on mobile devices */}
              <DatePicker.RangePicker
                  format="YYYY-MM-DD"
                  className="w-full"
                  getPopupContainer={() => document.body}
                  placement="topLeft"
                  classNames={isMobile ? {
                    popup: 'mobile-single-month-picker'
                  } : undefined}
              />
            </Form.Item>
            <Form.Item name="status" label={t('field.status')}>
              <Select
                  options={[
                    { label: t('status.not_started'), value: 'not_started' },
                    { label: t('status.in_progress'), value: 'in_progress' },
                    { label: t('status.completed'), value: 'completed' },
                  ]}
              />
            </Form.Item>
            <div className="sm:col-span-2" />
            <Form.Item name="today_task" label={t('field.todayTask')} className="sm:col-span-2">
              <Input.TextArea rows={2} placeholder={t('placeholder.todayTask')} />
            </Form.Item>
            <Form.Item name="progress_note" label={t('field.progressNote')} className="sm:col-span-2">
              <Input.TextArea rows={3} placeholder={t('placeholder.progressNote')} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
  )
}