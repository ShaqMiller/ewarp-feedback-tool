// Thrown by both the HTTP client and the demo API, so pages handle them the same way.
// `message` is written for people: forms show it as-is (e.g. "A vendor named Prism already exists.").
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const isNotFound = (err: unknown) => err instanceof ApiError && err.status === 404;

// The error codes in the contract, by status.
export const ERROR_CODES: Record<number, string> = { 400: "bad_request", 404: "not_found", 409: "conflict" };
