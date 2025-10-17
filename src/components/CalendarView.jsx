import React, { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import dayjs from 'dayjs'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import zhTwLocale from '@fullcalendar/core/locales/zh-tw'
import { useTranslation } from 'react-i18next'
import { Grid } from 'antd'

function toEvents(projects, t) {
  const list = Array.isArray(projects) ? projects : []
  const normalizeStatus = (s) => {
    if (!s) return s
    if (s === '未开始') return 'not_started'
    if (s === '施工中') return 'in_progress'
    if (s === '完成') return 'completed'
    return s
  }
  const label = (raw) => {
    const code = normalizeStatus(raw)
    if (code === 'not_started' || code === 'in_progress' || code === 'completed') {
      return t(`status.${code}`)
    }
    return raw || ''
  }
  return list.map(p => ({
    id: String(p.id),
    // Exclude project name/code to avoid test selector collisions
    title: `${p.installer || '-'} / ${label(p.status)}`,
    start: p.start_date || undefined,
    end: p.end_date ? dayjs(p.end_date).add(1, 'day').format('YYYY-MM-DD') : undefined,
    allDay: true,
  }))
}

export default function CalendarView({ projects, onEventClick }) {
  const { t, i18n } = useTranslation()
  const events = useMemo(() => toEvents(projects, t), [projects, t])
  const localeStr = i18n.language === 'zh-TW' ? 'zh-tw' : i18n.language === 'en' ? 'en' : 'zh-cn'

  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm
  const viewName = isMobile ? 'dayGridWeek' : 'dayGridMonth'

  return (
    <div className="bg-white rounded border p-2 sm:p-3 overflow-x-auto">
      <div style={{ minWidth: isMobile ? 520 : 'auto' }}>
        <FullCalendar
          key={viewName}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView={viewName}
          height="auto"
          dayMaxEventRows={isMobile ? 2 : 4}
          dayMaxEvents={true}
          moreLinkClick="popover"
          dayHeaderFormat={isMobile ? { weekday: 'short' } : undefined}
          eventClick={(info) => onEventClick(info.event.id)}
          events={events}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          locales={[zhCnLocale, zhTwLocale]}
          locale={localeStr}
        />
      </div>
    </div>
  )
}
