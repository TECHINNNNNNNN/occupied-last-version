export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: number
          name: string
          capacity: number
          has_projector: boolean
          photo_url?: string | null
          location?: string | null
          created_at?: string
        }
        Insert: {
          id?: number
          name: string
          capacity: number
          has_projector: boolean
          photo_url?: string | null
          location?: string | null
        }
        Update: {
          id?: number
          name?: string
          capacity?: number
          has_projector?: boolean
          photo_url?: string | null
          location?: string | null
        }
      }
      reservations: {
        Row: {
          id: string
          room_id: number
          user_email: string
          start_time: string
          end_time: string
          agenda: string
          num_people: number
          status: 'pending' | 'confirmed' | 'cancelled'
          hold_expiry?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: number
          user_email: string
          start_time: string
          end_time: string
          agenda: string
          num_people: number
          status: 'pending' | 'confirmed' | 'cancelled'
          hold_expiry?: string | null
        }
        Update: {
          id?: string
          room_id?: number
          user_email?: string
          start_time?: string
          end_time?: string
          agenda?: string
          num_people?: number
          status?: 'pending' | 'confirmed' | 'cancelled'
          hold_expiry?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          role: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: string
          name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
    }
    Functions: {
      check_reservation_overlap: {
        Args: {
          p_room_id: number
          p_start_time: string
          p_end_time: string
          p_exclude_reservation_id?: string
        }
        Returns: boolean
      }
      create_reservation_with_hold: {
        Args: {
          p_room_id: number
          p_start_time: string
          p_end_time: string
          p_agenda: string
          p_num_people: number
        }
        Returns: string
      }
      confirm_reservation: {
        Args: {
          p_reservation_id: string
        }
        Returns: boolean
      }
    }
  }
} 