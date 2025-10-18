import React, { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import dayjs from 'dayjs'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import zhTwLocale from '@fullcalendar/core/locales/zh-tw'
import { useTranslation } from 'react-i18next'
import { Grid } from 'antd'
import { normalizeStatus } from '../utils/status'

function toEvents(projects, t) {
  const list = Array.isArray(projects) ? projects : []
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

  return (
      <div className="bg-white rounded border p-2 sm:p-3 overflow-x-auto">
        <div style={{ minWidth: 'auto' }}>
          <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"
              dayMaxEventRows={isMobile ? 1 : 4}
              dayMaxEvents={true}
              moreLinkClick="popover"
              dayHeaderFormat={isMobile ? { weekday: 'narrow' } : undefined}
              eventClick={(info) => onEventClick(info.event.id)}
              events={events}
              headerToolbar={{
                left: 'prev,next',
                center: 'title',
                right: isMobile ? '' : 'today'
              }}
              locales={[zhCnLocale, zhTwLocale]}
              locale={localeStr}
              // Only show the current month (hide days from prev/next months)
              fixedWeekCount={false}
              showNonCurrentDates={false}
              contentHeight={isMobile ? 'auto' : undefined}
              aspectRatio={isMobile ? 1 : 1.35}
          />
        </div>
      </div>
  )
}