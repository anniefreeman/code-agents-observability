import type { Request, Response } from 'express';
import { SignupInputSchema } from './schemas';
import { authService } from './service';

export const signup = async (req: Request, res: Response): Promise<void> => {
  const result = SignupInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return;
  }
  const created = await authService.signup(result.data);
  res.status(201).json(created);
};
