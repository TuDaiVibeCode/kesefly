export const API_ERRORS = {
  AI_AUTH_REQUIRED: [401, 'Sign in before using cloud extraction.'],
  AI_CONSENT_REQUIRED: [403, 'Enable the current cloud AI consent before processing.'],
  AI_INPUT_INVALID: [400, 'Invalid extraction input. Use text up to 6000 characters or a JPEG, PNG, or WebP image up to 2 MiB.'],
  AI_UNAVAILABLE: [503, 'Cloud extraction is temporarily unavailable. Retry the same request later.'],
  REQUEST_PENDING: [409, 'This extraction request is already processing. Retry the same request later.'],
  REQUEST_ID_CONFLICT: [409, 'This request ID was already used for different input.'],
  REQUEST_FAILED: [502, 'This request did not complete and will not be sent again. Review manually or explicitly retry with a new request.'],
  REQUEST_EXPIRED: [410, 'This request has expired and cannot be sent again. Review manually or explicitly retry with a new request.'],
  QUOTA_EXCEEDED: [429, 'The cloud extraction reservation limit has been reached. Use manual entry.'],
} as const;
export type ErrorCode = keyof typeof API_ERRORS;
export class ApiError extends Error {
  readonly status: number;
  constructor(readonly code: ErrorCode) {
    super(API_ERRORS[code][1]);
    this.status = API_ERRORS[code][0];
  }
}
