import React from 'react'
import { Modal, Form, Grid, Input, Switch, Typography } from 'antd'
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
      address: values.address,
      sales_person: values.sales_person,
      installer: values.installer,
      team_members: values.team_members,
      start_date,
      end_date,
      today_task: values.today_task || '',
      progress_note: values.progress_note || '',
      change_note: values.change_note || '',
      // forward stages if provided
      stages: values.stages,
    }
    await onOk?.(payload)
    form.resetFields()
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel?.()
  }

  const StageRow = ({ flagKey, remarkKey, label, remarkLabel }) => (
    <div className="flex items-center gap-2">
      <Form.Item name={['stages', flagKey]} valuePropName="checked" noStyle>
        <Switch size="small" />
      </Form.Item>
      <span className="w-16 text-slate-700">{label}</span>
      <Form.Item name={['stages', remarkKey]} noStyle>
        <Input size="small" placeholder={remarkLabel} maxLength={255} />
      </Form.Item>
    </div>
  )

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
            initialValues={{}}
            requiredMark={false}
        >
          {/* Two-column layout on desktop, single column on mobile */}
          <ProjectFormFields layout="two-column" />

          {/* Stage status (edit/add mode) */}
          <div className="bg-white rounded border p-2 space-y-2 mt-2">
            <Typography.Text strong>{t('filter.stages')}</Typography.Text>
            <StageRow flagKey="glass" remarkKey="glassRemark" label={t('stage.glass')} remarkLabel={t('stageRemark.glass')} />
            <StageRow flagKey="frame" remarkKey="frameRemark" label={t('stage.frame')} remarkLabel={t('stageRemark.frame')} />
            <StageRow flagKey="purchase" remarkKey="purchaseRemark" label={t('stage.purchase')} remarkLabel={t('stageRemark.purchase')} />
            <StageRow flagKey="transport" remarkKey="transportRemark" label={t('stage.transport')} remarkLabel={t('stageRemark.transport')} />
            <StageRow flagKey="install" remarkKey="installRemark" label={t('stage.install')} remarkLabel={t('stageRemark.install')} />
            <StageRow flagKey="repair" remarkKey="repairRemark" label={t('stage.repair')} remarkLabel={t('stageRemark.repair')} />
          </div>
        </Form>
      </Modal>
  )
}