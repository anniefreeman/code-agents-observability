// Domain errors that cross feature boundaries. Features throw these from the
// service layer; the error-handling middleware in app.ts maps them to HTTP
// status codes via the abstract statusCode field.
//
// Yes, statusCode on a domain error is a small leak of HTTP into the domain.
// We accept it because:
//   - keeping the mapping next to the class avoids a separate registry that
//     has to be updated for every new error
//   - non-HTTP consumers can simply ignore the field
//
// Lives at top level (not under a feature folder) so the middleware imports
// these once and matches via instanceof of the base class — features can add
// new subclasses without touching the middleware.

export abstract class DomainError extends Error {
  abstract readonly statusCode: number;
}

export class NotFoundError extends DomainError {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class CapacityFullError extends DomainError {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'CapacityFullError';
  }
}

export class DuplicateBookingError extends DomainError {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateBookingError';
  }
}
