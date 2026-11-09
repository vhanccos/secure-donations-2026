import { apiRequest } from './apiClient';
import { Donation, CreateDonationInput, SimulateDonationInput } from '../types/donation';
import { ApiResponse } from '../types/api';

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC 4122 v4 compliant UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createDonation(
  input: CreateDonationInput,
  accessToken: string,
  idempotencyKey?: string
): Promise<Donation> {
  const key = idempotencyKey || generateIdempotencyKey();
  const res = await apiRequest<ApiResponse<Donation>>('/v1/donations', {
    method: 'POST',
    accessToken,
    idempotencyKey: key,
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function simulateDonation(
  donationId: string,
  input: SimulateDonationInput,
  accessToken: string
): Promise<Donation> {
  const res = await apiRequest<ApiResponse<Donation>>(`/v1/donations/${donationId}/simulate`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function getMyDonations(accessToken: string): Promise<Donation[]> {
  const res = await apiRequest<ApiResponse<Donation[]>>('/v1/donations/me', {
    method: 'GET',
    accessToken,
  });
  return res.data || [];
}
