import { apiRequest } from './apiClient';
import { AuditEvent, AuditQueryParams } from '../types/audit';
import { ApiResponse } from '../types/api';

export async function queryAuditEvents(
  params: AuditQueryParams = {},
  accessToken: string
): Promise<AuditEvent[]> {
  const query = new URLSearchParams();
  if (params.eventType) {
    query.set('eventType', params.eventType);
  }
  if (params.limit) {
    query.set('limit', String(params.limit));
  }
  const queryString = query.toString();
  const endpoint = `/v1/audit${queryString ? `?${queryString}` : ''}`;

  const res = await apiRequest<ApiResponse<AuditEvent[]>>(endpoint, {
    method: 'GET',
    accessToken,
  });
  return res.data || [];
}
