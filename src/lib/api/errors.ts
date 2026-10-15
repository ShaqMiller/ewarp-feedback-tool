// Thrown by both the HTTP client and the demo API, so pages handle them the same way.
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
