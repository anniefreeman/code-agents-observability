import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 doesn't forward Promise rejections to error middleware. Wrap
// async route handlers so a rejection becomes next(err). Express 5 makes
// this unnecessary.
export const asyncHandler =
  <P = unknown, ResBody = unknown, ReqBody = unknown>(
    fn: (
      req: Request<P, ResBody, ReqBody>,
      res: Response<ResBody>,
      next: NextFunction
    ) => Promise<unknown>
  ): RequestHandler<P, ResBody, ReqBody> =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
