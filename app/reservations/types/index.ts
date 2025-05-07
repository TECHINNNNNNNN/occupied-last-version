export interface Room {
  id: number;
  name: string;
  capacity: number;
  has_projector: boolean;
  photo_url?: string;
  location?: string;
}

export interface Reservation {
  id: string;
  room_id: number;
  user_email: string;
  start_time: string;
  end_time: string;
  agenda: string;
  num_people: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  hold_expiry?: string;
  created_at: string;
}

export interface RoomAvailability {
  roomId: number;
  availableSlots: string[];
  busySlots: string[];
}

// Props interfaces
export interface RoomListProps {
  onRoomSelect: (roomId: number | null) => void;
  selectedRoomId: number | null;
}

export interface TimelineSelectorProps {
  roomId: number;
  onTimeSelect: (slots: string[]) => void;
  selectedSlots: string[];
}

export interface RoomDetailsPanelProps {
  roomId: number | null;
}

export interface ReservationFormProps {
  roomId: number | null;
  selectedSlots: string[];
  onSubmit: (data: ReservationFormData) => Promise<void>;
  isSubmitting: boolean;
}

export interface ReservationFormData {
  agenda: string;
  numPeople: number;
}

// MyBookings component manages its own state and handles cancellation internally
export type MyBookingsProps = Record<never, never>; 