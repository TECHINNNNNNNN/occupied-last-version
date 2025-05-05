import { create } from 'zustand';
import type { Room, Reservation } from '../types';

interface ReservationStore {
  // Selected room
  selectedRoomId: number | null;
  setSelectedRoomId: (id: number | null) => void;

  // Selected time slots
  selectedSlots: string[];
  setSelectedSlots: (slots: string[]) => void;

  // Room data
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  isLoadingRooms: boolean;
  setIsLoadingRooms: (loading: boolean) => void;

  // User's reservations
  userReservations: Reservation[];
  setUserReservations: (reservations: Reservation[]) => void;
  isLoadingReservations: boolean;
  setIsLoadingReservations: (loading: boolean) => void;

  // Form data
  formData: {
    agenda: string;
    numPeople: number;
  };
  setFormData: (data: { agenda: string; numPeople: number }) => void;
  resetFormData: () => void;

  // Booking state
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
}

export const useReservationStore = create<ReservationStore>((set) => ({
  // Selected room
  selectedRoomId: null,
  setSelectedRoomId: (id) => set({ selectedRoomId: id, selectedSlots: [] }), // Reset slots on room change

  // Selected time slots
  selectedSlots: [],
  setSelectedSlots: (slots) => set({ selectedSlots: slots }),

  // Room data
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  isLoadingRooms: false,
  setIsLoadingRooms: (loading) => set({ isLoadingRooms: loading }),

  // User's reservations
  userReservations: [],
  setUserReservations: (reservations) => set({ userReservations: reservations }),
  isLoadingReservations: false,
  setIsLoadingReservations: (loading) => set({ isLoadingReservations: loading }),

  // Form data
  formData: {
    agenda: '',
    numPeople: 1,
  },
  setFormData: (data) => set({ formData: data }),
  resetFormData: () => set({ 
    formData: { 
      agenda: '', 
      numPeople: 1 
    } 
  }),

  // Booking state
  isSubmitting: false,
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),
})); 