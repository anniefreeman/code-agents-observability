import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { UserStoredSchema } from './stored';

extendZodWithOpenApi(z);

// Response — what clients see. Stored minus passwordHash. Defined via .omit
// so adding a field to stored doesn't accidentally leak it.
export const UserResponseSchema = UserStoredSchema.omit({
  passwordHash: true,
}).openapi('User');

export type UserResponse = z.infer<typeof UserResponseSchema>;
