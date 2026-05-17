import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// Input — what a client may POST to /auth/signup. Validation rules tighten as
// the test suite drives them in; this is the minimal shape that lets the
// happy-path test run.
export const SignupInputSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .strict()
  .openapi('SignupInput');

export type SignupInput = z.infer<typeof SignupInputSchema>;
