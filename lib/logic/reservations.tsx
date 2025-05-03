import { BANGKOK_TZ, TIME_SLOTS } from '@/constants/reservationsConstants'
import { toZonedTime } from 'date-fns-tz'
// Helper to check if slots are consecutive
export function areConsecutive(slots: string[]) {
  if (slots.length < 2) return true
  const indices = slots.map(s => TIME_SLOTS.indexOf(s)).sort((a, b) => a - b)
  for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) return false
    }
    return true
  }

// Helper to get the current time in Bangkok
function getBangkokNow() {
  return toZonedTime(new Date(), BANGKOK_TZ)
}

// Helper to get a Date in Bangkok for a given hour/minute
export function getBangkokDateForSlot(hour: number, min: number) {
  const now = getBangkokNow()
  const date = new Date(now)
  date.setHours(hour, min, 0, 0)
  return date
}

// Helper to convert UTC to Bangkok time for display (UTC+7)
export function utcToBangkokDisplay(utcDateString: string) {
  const utcDate = new Date(utcDateString);
  const bangkokDate = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
  return bangkokDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}