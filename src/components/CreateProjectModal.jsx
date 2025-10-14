import React from 'react'
import { Modal, Form, Input, DatePicker, Select } from 'antd'
import dayjs from 'dayjs'

export default function CreateProjectModal({ open, onCancel, onOk }) {
  const [form] = Form.useForm()

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
      status: values.status || '未开始',
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
      title="新增项目"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="创建"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: '未开始' }}
      >
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="例如：Greenlane House" />
        </Form.Item>
        <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
          <Input placeholder="例如：123 Greenlane Rd" />
        </Form.Item>
        <Form.Item name="client_name" label="客户姓名" rules={[{ required: true, message: '请输入客户姓名' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="client_phone" label="客户电话" rules={[{ required: true, message: '请输入客户电话' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="sales_person" label="销售负责人" rules={[{ required: true, message: '请输入销售负责人' }]}>
          <Input placeholder="如：Tim" />
        </Form.Item>
        <Form.Item name="installer" label="安装负责人" rules={[{ required: true, message: '请输入安装负责人' }]}>
          <Input placeholder="如：Peter" />
        </Form.Item>
        <Form.Item name="team_members" label="团队成员">
          <Input placeholder="逗号分隔：Peter, Jack" />
        </Form.Item>
        <Form.Item name="dates" label="施工日期" rules={[{ required: true, message: '请选择施工日期' }]}>
          <DatePicker.RangePicker format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            options={[
              { label: '未开始', value: '未开始' },
              { label: '施工中', value: '施工中' },
              { label: '完成', value: '完成' },
            ]}
          />
        </Form.Item>
        <Form.Item name="today_task" label="今日任务">
          <Input.TextArea rows={2} placeholder="例如：安装窗框（12个）" />
        </Form.Item>
        <Form.Item name="progress_note" label="状态备注">
          <Input.TextArea rows={3} placeholder="进度说明、完成百分比等" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

