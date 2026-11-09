export type DonationStatus = 'PENDIENTE_SIMULACION' | 'CONFIRMADA' | 'RECHAZADA';

export interface DonationSimulationDetails {
  timestamp: string;
  stage: string;
  notice: string;
}

export interface Donation {
  donationId: string;
  projectId: string;
  projectTitle?: string;
  donorSub: string;
  donorEmail?: string;
  amountCents: number;
  amountFormatted?: string;
  currency: string;
  status: DonationStatus;
  createdAt: string;
  confirmedAt?: string;
  rejectedAt?: string;
  simulationDetails?: DonationSimulationDetails;
}

export interface CreateDonationInput {
  projectId: string;
  amountCents: number;
}

export interface SimulateDonationInput {
  action: 'CONFIRMAR' | 'RECHAZAR';
}
