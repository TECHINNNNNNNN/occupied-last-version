# Chulalongkorn Engineering Library Database Schema

This document outlines the database schema for the Chulalongkorn Engineering Library Occupancy System, detailing tables, their relationships, and data types.

## Tables Overview

The database consists of three primary tables:

- `profiles`: Stores user profile information
- `rooms`: Stores details about available rooms in the library
- `reservations`: Tracks room reservations

## Table: profiles

Stores user profile information and authentication details.

| Column     | Type        | Description                                | Constraints |
| ---------- | ----------- | ------------------------------------------ | ----------- |
| id         | uuid        | Unique identifier for each user profile    | Primary Key |
| role       | text        | User role (student, faculty, staff, admin) |             |
| created_at | timestamptz | When the profile was created               |             |
| updated_at | timestamptz | When the profile was last updated          |             |
| name       | text        | User's full name                           |             |
| avatar_url | text        | URL to user's profile image                | Nullable    |

**Relationships:**

- `id` is linked to Supabase Authentication system via `auth.users.id`

## Table: rooms

Contains information about available rooms in the library.

| Column        | Type | Description                      | Constraints |
| ------------- | ---- | -------------------------------- | ----------- |
| id            | int4 | Unique identifier for each room  | Primary Key |
| name          | text | Room name/identifier             |             |
| capacity      | int4 | Maximum number of people allowed |             |
| has_projector | bool | Whether the room has a projector | Nullable    |
| photo_url     | text | URL to room photo                | Nullable    |
| location      | text | Room location description        | Nullable    |

## Table: reservations

Tracks room reservation details.

| Column      | Type        | Description                                  | Constraints            |
| ----------- | ----------- | -------------------------------------------- | ---------------------- |
| id          | uuid        | Unique identifier for each reservation       | Primary Key            |
| room_id     | int4        | ID of the reserved room                      | Foreign Key → rooms.id |
| user_email  | text        | Email of the user making the reservation     |                        |
| start_time  | timestamptz | Reservation start time                       |                        |
| end_time    | timestamptz | Reservation end time                         |                        |
| created_at  | timestamptz | When the reservation was created             |                        |
| agenda      | text        | Purpose of the reservation                   | Nullable               |
| num_people  | int4        | Expected number of attendees                 | Nullable               |
| status      | text        | Reservation status (active, cancelled, etc.) |                        |
| hold_expiry | timestamptz | When a held reservation expires              | Nullable               |

**Relationships:**

- `reservations.room_id` references `rooms.id`
- `user_email` would typically be associated with the authenticated user

## Database Relationships

```
profiles.id ──────────────────► auth.users.id
                                     ▲
                                     │
                                     │ (implied through authentication)
                                     │
reservations.user_email ─────────────┘
         │
         │
         ▼
reservations.room_id ───────────────► rooms.id
```

## Implementation Notes

1. The system uses Supabase for authentication and database functionality
2. Row Level Security (RLS) should be implemented to protect data
3. Real-time functionality is enabled through Supabase Realtime
4. The schema supports the core functionalities outlined in the project specs
5. Additional tables may be required for analytics and reporting features
6. All timestamp fields use `timestamptz` (timestamp with timezone) to ensure proper timezone handling
   - Data is stored internally in UTC format
   - Can be displayed to users in Bangkok local time (ICT/UTC+7)
   - Prevents timezone confusion and manual conversion
