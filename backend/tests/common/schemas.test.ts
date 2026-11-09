import { describe, it, expect } from 'vitest';
import {
  CreateDonationSchema,
  CreateProjectSchema,
  SimulateDonationSchema,
  validateIdempotencyKey,
} from '../../src/common/schemas';

describe('Zod Schemas - CreateDonationSchema (T04 defense)', () => {
  it('accepts valid donation amounts (100 to 100,000 cents)', () => {
    const valid1 = CreateDonationSchema.parse({ projectId: 'proj-1', amountCents: 100 });
    const valid2 = CreateDonationSchema.parse({ projectId: 'proj-1', amountCents: 50000 });
    const valid3 = CreateDonationSchema.parse({ projectId: 'proj-1', amountCents: 100000 });
    expect(valid1.amountCents).toBe(100);
    expect(valid2.amountCents).toBe(50000);
    expect(valid3.amountCents).toBe(100000);
  });

  it('rejects 0 cents (T04)', () => {
    const res = CreateDonationSchema.safeParse({ projectId: 'proj-1', amountCents: 0 });
    expect(res.success).toBe(false);
  });

  it('rejects negative cents', () => {
    const res = CreateDonationSchema.safeParse({ projectId: 'proj-1', amountCents: -500 });
    expect(res.success).toBe(false);
  });

  it('rejects amounts above 100,000 cents (T04)', () => {
    const res = CreateDonationSchema.safeParse({ projectId: 'proj-1', amountCents: 100001 });
    expect(res.success).toBe(false);
  });

  it('rejects non-integer floating point values (T04)', () => {
    const res = CreateDonationSchema.safeParse({ projectId: 'proj-1', amountCents: 500.5 });
    expect(res.success).toBe(false);
  });

  it('strictly rejects payloads containing sensitive credit card or banking details', () => {
    const res = CreateDonationSchema.safeParse({
      projectId: 'proj-1',
      amountCents: 5000,
      cardNumber: '4111111111111111',
      cvv: '123',
    });
    expect(res.success).toBe(false);
  });
});

describe('Zod Schemas - CreateProjectSchema', () => {
  it('accepts valid project data', () => {
    const parsed = CreateProjectSchema.parse({
      title: 'Comedor Solidario San Camilo',
      description: 'Apoyo alimentario para familias vulnerables en Arequipa.',
      goalAmountCents: 500000,
    });
    expect(parsed.title).toBe('Comedor Solidario San Camilo');
    expect(parsed.goalAmountCents).toBe(500000);
  });

  it('rejects too short title or description', () => {
    expect(
      CreateProjectSchema.safeParse({
        title: 'AB',
        description: 'Apoyo alimentario.',
        goalAmountCents: 500000,
      }).success
    ).toBe(false);

    expect(
      CreateProjectSchema.safeParse({
        title: 'Comedor Solidario',
        description: 'Corto',
        goalAmountCents: 500000,
      }).success
    ).toBe(false);
  });

  it('rejects non-integer goal amount', () => {
    expect(
      CreateProjectSchema.safeParse({
        title: 'Comedor Solidario',
        description: 'Apoyo alimentario para familias vulnerables.',
        goalAmountCents: 500.75,
      }).success
    ).toBe(false);
  });
});

describe('Zod Schemas - SimulateDonationSchema', () => {
  it('accepts CONFIRMAR and RECHAZAR actions', () => {
    expect(SimulateDonationSchema.parse({ action: 'CONFIRMAR' }).action).toBe('CONFIRMAR');
    expect(SimulateDonationSchema.parse({ action: 'RECHAZAR' }).action).toBe('RECHAZAR');
    expect(SimulateDonationSchema.parse({ action: 'CONFIRM' }).action).toBe('CONFIRM');
    expect(SimulateDonationSchema.parse({ action: 'REJECT' }).action).toBe('REJECT');
  });

  it('rejects invalid actions', () => {
    expect(SimulateDonationSchema.safeParse({ action: 'CANCELAR' }).success).toBe(false);
    expect(SimulateDonationSchema.safeParse({ action: 'INVALID' }).success).toBe(false);
  });
});

describe('Zod Schemas - validateIdempotencyKey', () => {
  it('accepts valid UUID v4', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(validateIdempotencyKey(validUuid)).toBe(validUuid);
  });

  it('rejects malformed or empty idempotency keys', () => {
    expect(() => validateIdempotencyKey('')).toThrow();
    expect(() => validateIdempotencyKey('not-a-uuid')).toThrow();
    expect(() => validateIdempotencyKey(null)).toThrow();
  });
});
