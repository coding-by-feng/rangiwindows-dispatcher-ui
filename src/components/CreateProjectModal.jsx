import React from 'react'
import { Modal, Form, Grid } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import ProjectFormFields from './ProjectFormFields'

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
      glass_ordered: values.glass_ordered === true, // normalize null/undefined -> false
      glass_manufactured: values.glass_manufactured === true && values.glass_ordered === true, // enforce sequence
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
          okButtonProps={{ 'data-tour-id': 'create-ok' }}
          cancelButtonProps={{ 'data-tour-id': 'create-cancel' }}
      >
        <Form
            form={form}
            layout="vertical"
            initialValues={{ status: 'not_started', glass_ordered: false, glass_manufactured: false }}
            requiredMark={false}
        >
          {/* Two-column layout on desktop, single column on mobile */}
          <ProjectFormFields layout="two-column" />
        </Form>
      </Modal>
  )
}