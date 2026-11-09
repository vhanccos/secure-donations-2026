export interface ApiResponse<T> {
  data: T;
  message?: string;
  count?: number;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  requestId?: string;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}
