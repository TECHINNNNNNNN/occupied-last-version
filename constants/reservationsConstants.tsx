export const ROOMS = [
  { id: 1, name: 'Room 1', hasProjector: true },
  { id: 2, name: 'Room 2', hasProjector: true },
  { id: 3, name: 'Room 3', hasProjector: true },
  { id: 4, name: 'Room 4', hasProjector: true },
  { id: 5, name: 'Room 5', hasProjector: true },
  { id: 6, name: 'Room 6', hasProjector: true },
  { id: 7, name: 'Room 7', hasProjector: true },
]

export const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2)
  const min = i % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${min}`
})

// Set the Bangkok timezone string
export const BANGKOK_TZ = 'Asia/Bangkok'