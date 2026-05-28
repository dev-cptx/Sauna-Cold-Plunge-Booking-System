'use client'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, addDays, startOfDay } from 'date-fns'
import 'react-day-picker/dist/style.css'

interface Props { onDateSelect: (date: Date) => void }

export default function BookingCalendar({ onDateSelect }: Props) {
  const [selected, setSelected] = useState<Date>()
  const tomorrow = addDays(startOfDay(new Date()), 1)
  const maxDate  = addDays(tomorrow, 59)

  const handleSelect = (date?: Date) => {
    if (!date) return
    setSelected(date)
    onDateSelect(date)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 inline-block">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={handleSelect}
        disabled={[{ before: tomorrow }, { after: maxDate }]}
        modifiers={{ booked: [] }}
        footer={
          selected
            ? <p className="text-sm text-center text-gray-500 mt-3">{format(selected, 'MMMM d, yyyy')} selected</p>
            : <p className="text-sm text-center text-gray-400 mt-3">Pick a date to see available sessions</p>
        }
      />
    </div>
  )
}
