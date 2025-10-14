import React, { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import dayjs from 'dayjs'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'

function toEvents(projects) {
  return (projects || []).map(p => ({
    id: String(p.id),
    title: `${p.name} / ${p.installer || '-'} / ${p.status || ''}`,
    start: p.start_date || undefined,
    end: p.end_date ? dayjs(p.end_date).add(1, 'day').format('YYYY-MM-DD') : undefined,
    allDay: true,
  }))
}

export default function CalendarView({ projects, onEventClick }) {
  const events = useMemo(() => toEvents(projects), [projects])
  return (
    <div className="bg-white rounded border p-2 sm:p-3">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        eventClick={(info) => onEventClick(info.event.id)}
        events={events}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        locales={[zhCnLocale]}
        locale='zh-cn'
      />
    </div>
  )
}
