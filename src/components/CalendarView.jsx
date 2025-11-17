// eslint-disable-next-line
import React, { useMemo } from 'react'
// eslint-disable-next-line
import FullCalendar from '@fullcalendar/react'
// eslint-disable-next-line
import dayGridPlugin from '@fullcalendar/daygrid'
// eslint-disable-next-line
import interactionPlugin from '@fullcalendar/interaction'
// eslint-disable-next-line
import dayjs from 'dayjs'
// eslint-disable-next-line
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
// eslint-disable-next-line
import zhTwLocale from '@fullcalendar/core/locales/zh-tw'
// eslint-disable-next-line
import { useTranslation } from 'react-i18next'
// eslint-disable-next-line
import { Grid } from 'antd'
// eslint-disable-next-line
import { normalizeStatus } from '../utils/status'
// eslint-disable-next-line
import axios from 'axios'

// Map location to lat/lon
const LOCATION_COORDS = {
  auckland: { latitude: -36.8485, longitude: 174.7633, timezone: 'Pacific/Auckland' },
  wellington: { latitude: -41.2865, longitude: 174.7762, timezone: 'Pacific/Auckland' },
  christchurch: { latitude: -43.5321, longitude: 172.6365, timezone: 'Pacific/Auckland' }
}

function toEvents(projects, t) {
  const list = Array.isArray(projects) ? projects : []
  return list.map(p => {
    const st = p.stages || {}
    const order = ['repair','install','transport','purchase','frame','glass']
    const first = order.find(k => !!st[k])
    const label = first ? t(`stage.${first}`) : ''
    return ({
      id: String(p.id),
      title: `${p.installer || '-'} / ${label || '-'}`,
      start: p.start_date || undefined,
      end: p.end_date ? dayjs(p.end_date).add(1, 'day').format('YYYY-MM-DD') : undefined,
      allDay: true,
    })
  })
}

// Weather hook always provides: historical (rain/temp) for past days, forecast probability within API horizon, approximate (prev year averages) for remainder up to one month
function useMonthlyWeather(location, visibleStart, visibleEnd, weatherTypes) {
  const [data, setData] = React.useState({})
  const [loading, setLoading] = React.useState(false)
  React.useEffect(() => {
    if (!location || !visibleStart || !visibleEnd) return
    const loc = LOCATION_COORDS[location]
    if (!loc) return
    if (!Array.isArray(weatherTypes) || weatherTypes.length === 0) { setData({}); return }

    const wantRain = weatherTypes.includes('rain')
    const wantTemp = weatherTypes.includes('temp')
    const wantProb = weatherTypes.includes('prob')

    const rangeStart = dayjs(visibleStart).startOf('day')
    // FullCalendar gives end exclusive; ensure inclusive end
    const rangeEnd = dayjs(visibleEnd).subtract(1, 'day').endOf('day')

    const today = dayjs().startOf('day')
    const forecastLimit = today.add(13, 'day').endOf('day') // ~14 days horizon
    const futureMonthLimit = today.add(30, 'day').endOf('day') // one month window

    // Clip range to one-month future window maximum (do not fetch beyond)
    const clippedEnd = rangeEnd.isAfter(futureMonthLimit) ? futureMonthLimit : rangeEnd

    // If entire visible range starts beyond one-month window, skip
    if (rangeStart.isAfter(futureMonthLimit)) { setData({}); return }

    const yesterday = today.subtract(1, 'day')
    const pastStart = rangeStart.isBefore(today) ? rangeStart : null
    const pastEnd = pastStart ? (clippedEnd.isBefore(yesterday) ? clippedEnd : yesterday) : null

    const futureStart = clippedEnd.isBefore(today) ? null : (rangeStart.isBefore(today) ? today : rangeStart)
    const futureEnd = futureStart ? (clippedEnd.isBefore(forecastLimit) ? clippedEnd : (forecastLimit.isBefore(futureMonthLimit) ? forecastLimit : futureMonthLimit)) : null

    let canceled = false
    async function run() {
      setLoading(true)
      const merged = {}
      try {
        // Historical rain & temp via ERA5 hourly (rangeStart..pastEnd)
        if (pastStart && pastEnd && !pastStart.isAfter(pastEnd) && (wantRain || wantTemp)) {
          const start = pastStart.format('YYYY-MM-DD')
          const end = pastEnd.format('YYYY-MM-DD')
          const hourlyVars = []
          if (wantTemp) hourlyVars.push('temperature_2m')
          if (wantRain) hourlyVars.push('precipitation')
          if (hourlyVars.length) {
            try {
              const url = `https://archive-api.open-meteo.com/v1/era5?latitude=${loc.latitude}&longitude=${loc.longitude}&start_date=${start}&end_date=${end}&hourly=${hourlyVars.join(',')}&timezone=${encodeURIComponent(loc.timezone)}`
              const resp = await axios.get(url, { timeout: 15000 })
              const times = resp?.data?.hourly?.time || []
              const temps = wantTemp ? resp?.data?.hourly?.temperature_2m || [] : []
              const precs = wantRain ? resp?.data?.hourly?.precipitation || [] : []
              const dailyAcc = {}
              times.forEach((ts, idx) => {
                const d = ts.slice(0,10)
                const acc = dailyAcc[d] || { tempSum:0, tempCount:0, rainSum:0 }
                if (wantTemp) { const tv = temps[idx]; if (typeof tv === 'number') { acc.tempSum += tv; acc.tempCount += 1 } }
                if (wantRain) { const rv = precs[idx]; if (typeof rv === 'number') { acc.rainSum += rv } }
                dailyAcc[d] = acc
              })
              Object.entries(dailyAcc).forEach(([d, acc]) => {
                const mm = wantRain ? +acc.rainSum.toFixed(1) : undefined
                const tempAvg = wantTemp && acc.tempCount ? +(acc.tempSum / acc.tempCount).toFixed(1) : undefined
                merged[d] = { ...(merged[d]||{}), ...(mm !== undefined ? { mm } : {}), ...(tempAvg !== undefined ? { tempAvg } : {}) }
              })
            } catch {}
          }
        }

        // Forecast probability + rainfall + temperature (futureStart..futureEnd)
        if ((wantProb || wantRain || wantTemp) && futureStart && futureEnd && !futureStart.isAfter(futureEnd)) {
          const startF = futureStart.format('YYYY-MM-DD')
          const endF = futureEnd.format('YYYY-MM-DD')
          const dailyVars = []
          if (wantProb) dailyVars.push('precipitation_probability_max')
          if (wantRain) dailyVars.push('precipitation_sum')
          if (wantTemp) { dailyVars.push('temperature_2m_max'); dailyVars.push('temperature_2m_min') }
          try {
            const urlF = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=${dailyVars.join(',')}&timezone=${encodeURIComponent(loc.timezone)}&start_date=${startF}&end_date=${endF}`
            const respF = await axios.get(urlF, { timeout: 12000 })
            const timesF = respF?.data?.daily?.time || []
            const probs = respF?.data?.daily?.precipitation_probability_max || []
            const rains = respF?.data?.daily?.precipitation_sum || []
            const tMax = respF?.data?.daily?.temperature_2m_max || []
            const tMin = respF?.data?.daily?.temperature_2m_min || []
            timesF.forEach((d, idx) => {
              const prob = wantProb ? (typeof probs[idx] === 'number' ? probs[idx] : null) : undefined
              const mm = wantRain ? (typeof rains[idx] === 'number' ? +rains[idx].toFixed(1) : null) : undefined
              let tempAvg
              if (wantTemp) {
                const maxV = typeof tMax[idx] === 'number' ? tMax[idx] : null
                const minV = typeof tMin[idx] === 'number' ? tMin[idx] : null
                if (maxV != null && minV != null) tempAvg = +(((maxV + minV)/2).toFixed(1))
              }
              merged[d] = { ...(merged[d]||{}), ...(prob !== undefined ? { prob } : {}), ...(mm !== undefined ? { mm } : {}), ...(tempAvg !== undefined ? { tempAvg } : {}) }
            })
          } catch {}
        }
      } finally {
        if (!canceled) setData(merged)
        if (!canceled) setLoading(false)
      }
    }
    run()
    return () => { canceled = true }
  }, [location, visibleStart, visibleEnd, weatherTypes])
  return { data, loading }
}

export default function CalendarView({ projects, onEventClick, location, weatherTypes }) {
  const { t, i18n } = useTranslation()
  const events = useMemo(() => toEvents(projects, t), [projects, t])
  const localeStr = i18n.language === 'zh-TW' ? 'zh-tw' : i18n.language === 'en' ? 'en' : 'zh-cn'
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm
  // Store visible range as millisecond timestamps to avoid new Date identity changes
  const [visibleStart, setVisibleStart] = React.useState(() => dayjs().startOf('month').valueOf())
  const [visibleEnd, setVisibleEnd] = React.useState(() => dayjs().endOf('month').add(1,'day').valueOf()) // exclusive end (ms)
  const { data: weatherMap, loading: weatherLoading } = useMonthlyWeather(location, visibleStart, visibleEnd, weatherTypes)
  const today = dayjs().startOf('day')

  return (
    <div className="bg-white rounded border p-2 sm:p-3 overflow-x-auto relative">
      {weatherLoading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-xs text-slate-500">Loading weather...</div>}
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
          headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
          locales={[zhCnLocale, zhTwLocale]}
          locale={localeStr}
          fixedWeekCount={false}
          showNonCurrentDates={false}
          contentHeight={isMobile ? 'auto' : undefined}
          aspectRatio={isMobile ? 1 : 1.35}
          datesSet={(arg) => {
            // Compute ms and only update if changed to avoid infinite loops
            const startMs = dayjs(arg.start).valueOf()
            const endMs = dayjs(arg.end).valueOf()
            setVisibleStart(prev => (prev === startMs ? prev : startMs))
            setVisibleEnd(prev => (prev === endMs ? prev : endMs))
          }}
          dayCellContent={(arg) => {
            const dateStr = dayjs(arg.date).format('YYYY-MM-DD')
            const w = weatherMap[dateStr] || {}
            const isPast = dayjs(dateStr).isBefore(today)
            const oneMonthAhead = today.add(30, 'day').endOf('day')
            const wantRain = weatherTypes.includes('rain')
            const wantTemp = weatherTypes.includes('temp')
            const wantProb = weatherTypes.includes('prob')
            if (!isPast && dayjs(dateStr).isAfter(oneMonthAhead)) {
              return (
                <div className="flex flex-col items-start">
                  <span className="fc-daygrid-day-number">{arg.dayNumberText}</span>
                </div>
              )
            }
            const parts = []
            if (wantProb && w.prob != null) parts.push(`${w.prob}%`)
            if (wantRain && w.mm != null) parts.push(`${w.mm}mm`)
            if (wantTemp && w.tempAvg != null) parts.push(`${w.tempAvg}°`)
            return (
              <div className="flex flex-col items-start">
                <span className="fc-daygrid-day-number">{arg.dayNumberText}</span>
                {parts.length > 0 && (
                  <div className="flex flex-col gap-[2px] mt-0.5">
                    {parts.map((txt, idx) => (
                      <span key={idx} className="text-[9px] leading-none text-slate-700">{txt}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
