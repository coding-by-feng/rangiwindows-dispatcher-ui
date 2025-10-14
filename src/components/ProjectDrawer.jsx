import React from 'react'
import { Descriptions, Drawer, Form, Input, Select, Upload, Button, Space, Grid } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

export default function ProjectDrawer({ open, project, onClose, onSave, onUpload }) {
  const [form] = Form.useForm()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm

  React.useEffect(() => {
    form.setFieldsValue(project)
  }, [project])

  const onFinish = async () => {
    const values = await form.validateFields()
    onSave(values)
  }

  return (
    <Drawer open={open} onClose={onClose} width={isMobile ? '100%' : 520} title={`项目详情 ${project?.project_code || ''}`} destroyOnClose>
      {project && (
        <Space direction="vertical" className="w-full" size="large">
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
            <Descriptions.Item label="地址">{project.address}</Descriptions.Item>
            <Descriptions.Item label="客户">{project.client_name} / {project.client_phone}</Descriptions.Item>
            <Descriptions.Item label="销售">{project.sales_person}</Descriptions.Item>
            <Descriptions.Item label="安装">{project.installer}</Descriptions.Item>
            <Descriptions.Item label="施工期">{project.start_date} ~ {project.end_date}</Descriptions.Item>
          </Descriptions>

          <Form layout="vertical" form={form} initialValues={project} onFinish={onFinish}>
            <Form.Item name="today_task" label="今日任务">
              <Input.TextArea rows={2} placeholder="例如：安装窗框（12个）" />
            </Form.Item>
            <Form.Item name="progress_note" label="状态备注">
              <Input.TextArea rows={3} placeholder="进度说明、完成百分比等" />
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
            <Space>
              <Button type="primary" onClick={onFinish}>保存</Button>
              <Button onClick={onClose}>关闭</Button>
            </Space>
          </Form>

          <div>
            <div className="font-medium mb-2">现场照片</div>
            {project.photo_url && (
              <a href={project.photo_url} target="_blank" className="block text-blue-600 mb-2">查看已上传照片</a>
            )}
            <Upload
              showUploadList={false}
              beforeUpload={(file) => {
                onUpload(file)
                return false
              }}
            >
              <Button icon={<UploadOutlined />}>上传照片</Button>
            </Upload>
          </div>
        </Space>
      )}
    </Drawer>
  )
}
