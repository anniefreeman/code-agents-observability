import { z } from 'zod';

// Stored — what lives in the user table. Plaintext password is replaced by a
// bcrypt hash before reaching this shape.
export const UserStoredSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  passwordHash: z.string(),
  createdAt: z.string().datetime(),
});

export type UserStored = z.infer<typeof UserStoredSchema>;
