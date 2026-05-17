import { randomUUID } from 'node:crypto';
import type {
  WaitlistEntryInput,
  WaitlistEntryStored,
  WaitlistEntryResponse,
} from './schemas';

export const toStored = (input: WaitlistEntryInput): WaitlistEntryStored => ({
  ...input,
  id: randomUUID(),
  status: 'waiting',
  createdAt: new Date().toISOString(),
  promotedAt: null,
  leftAt: null,
});

export const promote = (entry: WaitlistEntryStored): WaitlistEntryStored => ({
  ...entry,
  status: 'promoted',
  promotedAt: new Date().toISOString(),
});

export const leave = (entry: WaitlistEntryStored): WaitlistEntryStored => ({
  ...entry,
  status: 'left',
  leftAt: new Date().toISOString(),
});

// Position is meaningful only for 'waiting' entries; terminal states (promoted,
// left) carry null. The caller supplies the 1-based rank computed from the
// session-scoped queue.
export const toResponse = (
  stored: WaitlistEntryStored,
  position: number | null
): WaitlistEntryResponse => ({ ...stored, position });
