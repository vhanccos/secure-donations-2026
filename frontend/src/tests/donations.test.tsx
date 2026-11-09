import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DonationForm } from '../components/donations/DonationForm';
import { generateIdempotencyKey, createDonation } from '../services/donations.service';

describe('Data Minimization & Donation UI Guardrails (Zero Trust)', () => {
  it('generates a valid RFC 4122 UUID v4 Idempotency-Key and withstands 1,000 iterations without collisions', () => {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const key = generateIdempotencyKey();
      expect(key).toMatch(uuidV4Regex);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('empirically verifies createDonation attaches Idempotency-Key and Authorization Bearer headers', async () => {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let capturedHeaders: Headers | null = null;
    let capturedBody: string = '';

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
      capturedHeaders = new Headers(opts.headers);
      capturedBody = opts.body as string;
      return {
        ok: true,
        status: 201,
        text: async () => JSON.stringify({
          data: {
            donationId: 'don-test-emp-123',
            projectId: 'proj-123',
            donorSub: 'sub-donante-456',
            amountCents: 5000,
            status: 'PENDIENTE',
            createdAt: new Date().toISOString(),
          }
        }),
      } as Response;
    });

    try {
      const result = await createDonation(
        { projectId: 'proj-123', amountCents: 5000 },
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock'
      );

      expect(result.donationId).toBe('don-test-emp-123');
      expect(capturedHeaders).not.toBeNull();
      const idempotencyKey = capturedHeaders!.get('Idempotency-Key');
      expect(idempotencyKey).not.toBeNull();
      expect(idempotencyKey).toMatch(uuidV4Regex);
      expect(capturedHeaders!.get('Authorization')).toBe('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock');
      expect(JSON.parse(capturedBody)).toEqual({ projectId: 'proj-123', amountCents: 5000 });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('STRICT ZERO TOLERANCE: contains ZERO credit card, CVV, expiry, or bank account fields', () => {
    const mockSubmit = vi.fn();
    const { container } = render(
      <DonationForm
        projectId="proj-123"
        projectTitle="Campaña Solidaria UNSA"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );

    // Verify no card/banking inputs by label or placeholder
    expect(screen.queryByLabelText(/tarjeta|card|pan|cvv|cvc|expiraci[oó]n|cuenta|banco/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/tarjeta|card|cvv|16|0000/i)).toBeNull();

    // Verify all input elements in the form are strictly the amount input
    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBe(1);
    expect(inputs[0].getAttribute('type')).toBe('number');
    expect(inputs[0].getAttribute('id')).toBe('custom-amount-input');
  });

  it('validates minimum (S/ 1.00) and maximum (S/ 1,000.00) donation limits', async () => {
    const mockSubmit = vi.fn();
    render(
      <DonationForm
        projectId="proj-123"
        projectTitle="Campaña Solidaria UNSA"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );

    const input = screen.getByLabelText(/monto personalizado/i);

    // Test below minimum (0)
    await act(async () => {
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.submit(screen.getByRole('button', { name: /generar intenci[oó]n/i }));
    });
    expect(mockSubmit).not.toHaveBeenCalled();

    // Test above maximum (1500)
    await act(async () => {
      fireEvent.change(input, { target: { value: '1500' } });
      fireEvent.submit(screen.getByRole('button', { name: /generar intenci[oó]n/i }));
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits valid amount converted to integer amountCents', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <DonationForm
        projectId="proj-123"
        projectTitle="Campaña Solidaria UNSA"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );

    // Click preset S/ 50
    const preset50 = screen.getByRole('button', { name: 'S/ 50' });
    await act(async () => {
      fireEvent.click(preset50);
    });

    const submitBtn = screen.getByRole('button', { name: /generar intenci[oó]n de donaci[oó]n por s\/ 50\.00/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // 50 Soles must be converted to 5000 cents integer
    expect(mockSubmit).toHaveBeenCalledWith(5000);
  });
});
