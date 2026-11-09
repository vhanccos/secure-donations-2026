/**
 * Structured CloudWatch JSON Logger with Deep-Cleaning Secret Redaction (RNF-HU-07)
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  action: string;
  actor: string;
  statusCode?: number;
  durationMs?: number;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED' | 'IN_PROGRESS';
  resource?: string;
  message?: string;
  details?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_KEY_REGEX =
  /^(authorization|password|secret|token|access_token|id_token|refresh_token|credit_?card|card_?number|cvv|account_?number|totp|secret_?key)$/i;

const JWT_REGEX =
  /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;

const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;

/**
 * Deep sanitization function to remove secrets, tokens, and sensitive data.
 * Safe against circular references.
 */
export function sanitize(input: unknown, visited = new WeakSet()): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized = input.replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]');
    sanitized = sanitized.replace(JWT_REGEX, '[REDACTED_JWT]');
    sanitized = sanitized.replace(CREDIT_CARD_REGEX, '[REDACTED_CARD]');
    return sanitized;
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'object') {
    if (visited.has(input as object)) {
      return '[CIRCULAR_REFERENCE]';
    }
    visited.add(input as object);

    if (Array.isArray(input)) {
      return input.map((item) => sanitize(item, visited));
    }

    if (input instanceof Error) {
      return {
        name: input.name,
        message: sanitize(input.message, visited) as string,
        stack: input.stack ? (sanitize(input.stack, visited) as string) : undefined,
      };
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitize(value, visited);
      }
    }
    return sanitizedObj;
  }

  return String(input);
}

export class StructuredLogger {
  private requestId: string;
  private action: string;
  private actor: string;
  private startTime: number;

  constructor(requestId: string, action: string, actor = 'ANONYMOUS') {
    this.requestId = requestId;
    this.action = action;
    this.actor = actor;
    this.startTime = Date.now();
  }

  public setActor(actor: string): void {
    this.actor = actor;
  }

  public setAction(action: string): void {
    this.action = action;
  }

  private write(
    level: LogLevel,
    outcome: LogEntry['outcome'],
    statusCode?: number,
    message?: string,
    resource?: string,
    details?: Record<string, unknown>,
    error?: unknown
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestId,
      action: this.action,
      actor: this.actor,
      outcome,
      durationMs: Date.now() - this.startTime,
    };

    if (statusCode !== undefined) entry.statusCode = statusCode;
    if (message !== undefined) entry.message = message;
    if (resource !== undefined) entry.resource = resource;
    if (details !== undefined) {
      entry.details = sanitize(details) as Record<string, unknown>;
    }
    if (error !== undefined) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: sanitize(error.message) as string,
          stack: error.stack ? (sanitize(error.stack) as string) : undefined,
        };
      } else {
        entry.error = {
          name: 'UnknownError',
          message: sanitize(String(error)) as string,
        };
      }
    }

    const line = JSON.stringify(entry);
    if (level === 'ERROR') {
      console.error(line);
    } else if (level === 'WARN') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  public info(
    message: string,
    statusCode = 200,
    resource?: string,
    details?: Record<string, unknown>
  ): void {
    this.write('INFO', 'SUCCESS', statusCode, message, resource, details);
  }

  public warn(
    message: string,
    statusCode = 400,
    resource?: string,
    details?: Record<string, unknown>
  ): void {
    this.write('WARN', 'FAILURE', statusCode, message, resource, details);
  }

  public denied(
    message: string,
    statusCode = 403,
    resource?: string,
    details?: Record<string, unknown>
  ): void {
    this.write('WARN', 'DENIED', statusCode, message, resource, details);
  }

  public error(
    message: string,
    statusCode = 500,
    error?: unknown,
    resource?: string,
    details?: Record<string, unknown>
  ): void {
    this.write('ERROR', 'FAILURE', statusCode, message, resource, details, error);
  }
}
