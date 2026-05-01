import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const SessionTypeSchema = z.enum([
  'tennis',
  'pilates',
  'dance',
  'hike',
  'climb',
  'pottery',
]);

const LocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// Input — what a client may POST/PUT.
// .strict() rejects unknown fields, which gives mass-assignment protection
// for free: clients can't sneak in id, status, bookedCount, timestamps,
// because those fields don't exist here.
export const SessionInputSchema = z
  .object({
    type: SessionTypeSchema,
    title: z.string().min(1),
    description: z.string().optional(),
    startsAt: z.string().datetime(),
    durationMinutes: z.number().int().positive(),
    capacity: z.number().int().positive(),
    location: LocationSchema,
    hostName: z.string().min(1),
    priceCents: z.number().int().nonnegative().optional(),
  })
  .strict()
  .openapi('NewSession');

export type SessionInput = z.infer<typeof SessionInputSchema>;
