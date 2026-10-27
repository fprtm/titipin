export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
