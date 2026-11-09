export interface AuditEvent {
  eventType: string;
  timestamp: string;
  timestamp_id: string;
  requestId: string;
  actorRef: string;
  resourceRef: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE';
  details?: Record<string, unknown>;
}

export interface AuditQueryParams {
  eventType?: string;
  limit?: number;
}
