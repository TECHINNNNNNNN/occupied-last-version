import { TIME_SLOTS } from '@/constants/reservationsConstants'

// Helper to check if slots are consecutive
export function areConsecutive(slots: string[]) {
  if (slots.length < 2) return true
  const indices = slots.map(s => TIME_SLOTS.indexOf(s)).sort((a, b) => a - b)
  for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) return false
    }
    return true
  }