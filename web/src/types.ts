export type SessionType =
  | 'tennis'
  | 'pilates'
  | 'dance'
  | 'hike'
  | 'climb'
  | 'pottery';

export type SessionStatus = 'scheduled' | 'cancelled' | 'completed';

export interface Session {
  id: string;
  type: SessionType;
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  location: { name: string; address?: string };
  hostName: string;
  priceCents?: number;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  bookedCount: number;
  availableSpots: number;
  isFull: boolean;
}
