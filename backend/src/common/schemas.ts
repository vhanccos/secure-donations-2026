/**
 * Zod Validation Schemas and Data Minimization Guardrails (Zero Trust)
 */
import { z } from 'zod';

export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CreateProjectSchema = z
  .object({
    title: z
      .string({ required_error: 'El título es obligatorio' })
      .trim()
      .min(3, 'El título debe contener al menos 3 caracteres')
      .max(120, 'El título no puede exceder los 120 caracteres'),
    description: z
      .string({ required_error: 'La descripción es obligatoria' })
      .trim()
      .min(10, 'La descripción debe contener al menos 10 caracteres')
      .max(2000, 'La descripción no puede exceder los 2000 caracteres'),
    goalAmountCents: z
      .number({ required_error: 'La meta es obligatoria', invalid_type_error: 'La meta debe ser un número entero' })
      .int('La meta debe ser un entero en céntimos sin decimales')
      .positive('La meta debe ser un monto positivo')
      .min(10000, 'La meta mínima es S/ 100.00 (10,000 céntimos)')
      .max(100000000, 'La meta no puede exceder S/ 1,000,000.00 (100,000,000 céntimos)'),
  })
  .strict();

export const CreateDonationSchema = z
  .object({
    projectId: z
      .string({ required_error: 'projectId es requerido' })
      .trim()
      .min(1, 'projectId no puede estar vacío'),
    amountCents: z
      .number({ required_error: 'amountCents es requerido', invalid_type_error: 'amountCents debe ser un número entero' })
      .int('amountCents debe ser un entero en céntimos sin decimales')
      .min(100, 'El monto mínimo es S/ 1.00 (100 céntimos)')
      .max(100000, 'El monto máximo es S/ 1,000.00 (100,000 céntimos)'),
  })
  .strict();

export const SimulateDonationSchema = z
  .object({
    action: z.enum(['CONFIRMAR', 'RECHAZAR', 'CONFIRM', 'REJECT'], {
      errorMap: () => ({ message: "La acción debe ser 'CONFIRMAR' o 'RECHAZAR'" }),
    }),
  })
  .strict();

export function validateIdempotencyKey(key?: string | null): string {
  if (!key || typeof key !== 'string' || !UUID_V4_REGEX.test(key.trim())) {
    throw new Error('Cabecera Idempotency-Key requerida y debe ser un UUID v4 válido');
  }
  return key.trim();
}

export function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.') || 'body'}: ${e.message}`).join(', ');
}
