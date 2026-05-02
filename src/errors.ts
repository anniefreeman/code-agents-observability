// Domain errors that cross feature boundaries. Features throw these from the
// service layer; HTTP-aware middleware in app.ts maps them to status codes.
//
// Lives at top level (not under a feature folder) because:
//   - the error-handling middleware imports it once and matches via instanceof
//   - multiple features will throw the same class, so identity must be shared
//   - it has no feature-specific shape

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
