/**
 * Atomic DynamoDB TransactWriteItems Implementation
 * Handles POST /v1/donations (Idempotency) and POST /v1/donations/{id}/simulate (Concurrency)
 */
import * as crypto from 'node:crypto';
import { GetCommand, TransactWriteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLES } from '../common/dynamo';
import { buildIdempotencyPk, computeCanonicalPayloadHash, IdempotencyRecord } from '../common/idempotency';
import { StructuredLogger } from '../common/logger';

export interface CreateDonationInput {
  donorSub: string;
  idempotencyKey: string;
  projectId: string;
  amountCents: number;
}

export interface CreateDonationResult {
  isReplay: boolean;
  statusCode: number;
  body: Record<string, unknown>;
}

export class IdempotencyConflictError extends Error {
  constructor(message = 'La clave de idempotencia ya fue utilizada con parámetros diferentes') {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

export class ProjectNotFoundError extends Error {
  constructor(message = 'Proyecto destino no encontrado') {
    super(message);
    this.name = 'ProjectNotFoundError';
  }
}

export class ProjectNotPublishedError extends Error {
  constructor(message = 'El proyecto no está publicado para recibir donaciones') {
    super(message);
    this.name = 'ProjectNotPublishedError';
  }
}

export class DonationNotFoundError extends Error {
  constructor(message = 'Donación no encontrada') {
    super(message);
    this.name = 'DonationNotFoundError';
  }
}

export class ForbiddenOwnershipError extends Error {
  constructor(message = 'Acceso denegado: no es propietario de esta donación') {
    super(message);
    this.name = 'ForbiddenOwnershipError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(message = 'Transición inválida o concurrente: la donación no se encuentra en estado pendiente') {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}

function formatCurrency(amountCents: number): string {
  const soles = (amountCents / 100).toFixed(2);
  const parts = soles.split('.');
  const integerPart = parts[0]?.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';
  return `S/ ${integerPart}.${parts[1] || '00'}`;
}

async function recordAuditEvent(params: {
  eventType: string;
  actorRef: string;
  resourceRef: string;
  action: string;
  outcome: string;
}): Promise<void> {
  try {
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    await docClient.send(
      new PutCommand({
        TableName: TABLES.AUDIT_EVENTS,
        Item: {
          eventType: params.eventType,
          'timestamp#eventId': `${timestamp}#${eventId}`,
          eventId,
          timestamp,
          actorRef: params.actorRef,
          resourceRef: params.resourceRef,
          action: params.action,
          outcome: params.outcome,
        },
      })
    );
  } catch (auditErr) {
    console.error('Failed to write to AuditEventsTable:', auditErr);
  }
}

/**
 * Executes POST /v1/donations with atomic reservation of idempotency key and donation.
 * Resolves T05, T06 (replay 201), and T07 (conflict 409).
 */
export async function executeCreateDonationTransaction(
  input: CreateDonationInput,
  logger: StructuredLogger
): Promise<CreateDonationResult> {
  const { donorSub, idempotencyKey, projectId, amountCents } = input;
  const idempotencyPk = buildIdempotencyPk(donorSub, idempotencyKey);
  const payloadHash = computeCanonicalPayloadHash({ projectId, amountCents });

  // 1. Verify Project existence and status (ConsistentRead) (CA-05.2)
  const projectResult = await docClient.send(
    new GetCommand({
      TableName: TABLES.PROJECTS,
      Key: { projectId },
      ConsistentRead: true,
    })
  );

  if (!projectResult.Item) {
    logger.warn(`Project ${projectId} not found`, 404, projectId);
    throw new ProjectNotFoundError();
  }

  if (projectResult.Item.status !== 'PUBLICADO') {
    logger.warn(`Project ${projectId} status is ${projectResult.Item.status}, expected PUBLICADO`, 409, projectId);
    throw new ProjectNotPublishedError();
  }

  const donationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const ttlSeconds = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours TTL

  const responseBody = {
    message: 'Intención de donación registrada en modo simulación académica',
    data: {
      donationId,
      projectId,
      donorSub,
      amountCents,
      amountFormatted: formatCurrency(amountCents),
      currency: 'PEN',
      status: 'PENDIENTE_SIMULACION',
      idempotencyKey,
      academicNotice: 'Simulación académica: no se ha realizado ningún cobro',
      createdAt: now,
      updatedAt: now,
    },
  };

  // 2. Execute Atomic TransactWriteItems
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          // Item 1: Idempotency Key Reservation
          {
            Put: {
              TableName: TABLES.IDEMPOTENCY,
              Item: {
                pk: idempotencyPk,
                payloadHash,
                donationId,
                responseStatus: 201,
                responseBody,
                createdAt: now,
                expiresAt: ttlSeconds,
              },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          // Item 2: Donation Record Creation
          {
            Put: {
              TableName: TABLES.DONATIONS,
              Item: {
                donationId,
                projectId,
                donorSub,
                amountCents,
                currency: 'PEN',
                status: 'PENDIENTE_SIMULACION',
                createdAt: now,
                updatedAt: now,
              },
              ConditionExpression: 'attribute_not_exists(donationId)',
            },
          },
        ],
      })
    );

    // Record audit event
    await recordAuditEvent({
      eventType: 'DONATION_INTENTION_CREATED',
      actorRef: donorSub,
      resourceRef: donationId,
      action: 'CREATE_DONATION_INTENTION',
      outcome: 'SUCCESS',
    });

    logger.info('Donation intention created successfully', 201, donationId, { amountCents });
    return { isReplay: false, statusCode: 201, body: responseBody };
  } catch (err: unknown) {
    // 3. Handle Transaction Cancellation (Key collision / Replay resolution)
    const isTransactCanceled =
      err instanceof TransactionCanceledException ||
      (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'TransactionCanceledException');

    if (isTransactCanceled) {
      // Check existing idempotency record with ConsistentRead
      const existing = await docClient.send(
        new GetCommand({
          TableName: TABLES.IDEMPOTENCY,
          Key: { pk: idempotencyPk },
          ConsistentRead: true,
        })
      );

      if (existing.Item) {
        const recorded = existing.Item as IdempotencyRecord;
        if (recorded.payloadHash === payloadHash) {
          // Exact replay (T06): Return cached response
          logger.info('Idempotent replay detected with matching payload', 201, recorded.donationId, { isReplay: true });
          return {
            isReplay: true,
            statusCode: recorded.responseStatus || 201,
            body: recorded.responseBody,
          };
        } else {
          // Key reused with different payload (T07): Return 409 Conflict
          logger.warn('Idempotency key reused with mismatched payload hash', 409, idempotencyKey);
          throw new IdempotencyConflictError();
        }
      }
    }

    throw err;
  }
}

export interface SimulateDonationInput {
  donationId: string;
  callerSub: string;
  action: 'CONFIRMAR' | 'RECHAZAR' | 'CONFIRM' | 'REJECT';
}

export interface SimulateDonationResult {
  statusCode: number;
  body: Record<string, unknown>;
}

/**
 * Executes POST /v1/donations/{id}/simulate with atomic state transition and balance increment.
 * Guarantees T08 defense (10 concurrent requests -> 1 success, 9 conflicts).
 */
export async function executeSimulateDonationTransaction(
  input: SimulateDonationInput,
  logger: StructuredLogger
): Promise<SimulateDonationResult> {
  const { donationId, callerSub, action } = input;
  const isConfirm = action === 'CONFIRMAR' || action === 'CONFIRM';
  const targetStatus = isConfirm ? 'CONFIRMADA_SIMULADA' : 'RECHAZADA_SIMULADA';

  // 1. Fetch current donation with ConsistentRead
  const donationResult = await docClient.send(
    new GetCommand({
      TableName: TABLES.DONATIONS,
      Key: { donationId },
      ConsistentRead: true,
    })
  );

  const donation = donationResult.Item;
  if (!donation) {
    logger.warn(`Donation ${donationId} not found`, 404, donationId);
    throw new DonationNotFoundError();
  }

  // 2. Validate Ownership (BOLA prevention: CA-07.2, T09)
  if (donation.donorSub !== callerSub) {
    logger.denied(`User ${callerSub} attempted to simulate donation owned by ${donation.donorSub}`, 403, donationId);
    throw new ForbiddenOwnershipError();
  }

  // 3. Validate Initial State (CA-06.2)
  if (donation.status !== 'PENDIENTE_SIMULACION') {
    logger.warn(`Donation ${donationId} status is ${donation.status}, expected PENDIENTE_SIMULACION`, 409, donationId);
    throw new InvalidStateTransitionError(
      `La donación ya ha sido procesada previamente y se encuentra en estado ${donation.status}`
    );
  }

  const now = new Date().toISOString();

  // 4. Atomic Transaction Execution
  try {
    if (targetStatus === 'CONFIRMADA_SIMULADA') {
      // Confirm: atomically transition donation AND add to project balance (CA-NF04.1, T08)
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            // Item 1: Update donation status
            {
              Update: {
                TableName: TABLES.DONATIONS,
                Key: { donationId },
                UpdateExpression: 'SET #st = :newStatus, #updatedAt = :now',
                ConditionExpression:
                  'attribute_exists(donationId) AND #st = :pendingStatus AND #donor = :callerSub',
                ExpressionAttributeNames: {
                  '#st': 'status',
                  '#updatedAt': 'updatedAt',
                  '#donor': 'donorSub',
                },
                ExpressionAttributeValues: {
                  ':newStatus': 'CONFIRMADA_SIMULADA',
                  ':pendingStatus': 'PENDIENTE_SIMULACION',
                  ':callerSub': callerSub,
                  ':now': now,
                },
              },
            },
            // Item 2: Atomically increment project balance
            {
              Update: {
                TableName: TABLES.PROJECTS,
                Key: { projectId: donation.projectId },
                UpdateExpression: 'ADD #confirmed :amount SET #updatedAt = :now',
                ConditionExpression:
                  'attribute_exists(projectId) AND #pStatus = :publishedStatus',
                ExpressionAttributeNames: {
                  '#confirmed': 'confirmedAmountCents',
                  '#updatedAt': 'updatedAt',
                  '#pStatus': 'status',
                },
                ExpressionAttributeValues: {
                  ':amount': donation.amountCents,
                  ':publishedStatus': 'PUBLICADO',
                  ':now': now,
                },
              },
            },
          ],
        })
      );
    } else {
      // Reject: update donation only, do NOT alter project totals (CA-06.3)
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: TABLES.DONATIONS,
                Key: { donationId },
                UpdateExpression: 'SET #st = :newStatus, #updatedAt = :now',
                ConditionExpression:
                  'attribute_exists(donationId) AND #st = :pendingStatus AND #donor = :callerSub',
                ExpressionAttributeNames: {
                  '#st': 'status',
                  '#updatedAt': 'updatedAt',
                  '#donor': 'donorSub',
                },
                ExpressionAttributeValues: {
                  ':newStatus': 'RECHAZADA_SIMULADA',
                  ':pendingStatus': 'PENDIENTE_SIMULACION',
                  ':callerSub': callerSub,
                  ':now': now,
                },
              },
            },
          ],
        })
      );
    }

    // Record audit event
    await recordAuditEvent({
      eventType: 'DONATION_SIMULATION_EXECUTED',
      actorRef: callerSub,
      resourceRef: donationId,
      action: targetStatus === 'CONFIRMADA_SIMULADA' ? 'CONFIRM_DONATION' : 'REJECT_DONATION',
      outcome: 'SUCCESS',
    });

    const responseBody = {
      message: 'Simulación académica procesada exitosamente',
      data: {
        donationId,
        projectId: donation.projectId,
        amountCents: donation.amountCents,
        amountFormatted: formatCurrency(donation.amountCents),
        currency: 'PEN',
        status: targetStatus,
        updatedAt: now,
        academicNotice: 'Simulación académica: no se ha realizado ningún cobro',
      },
    };

    logger.info('Donation simulation completed successfully', 200, donationId, { targetStatus });
    return { statusCode: 200, body: responseBody };
  } catch (err: unknown) {
    const isTransactCanceled =
      err instanceof TransactionCanceledException ||
      (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'TransactionCanceledException');

    if (isTransactCanceled) {
      // Race condition lost (T08 defense)
      logger.warn(`Transaction canceled for donation ${donationId} (concurrent modification)`, 409, donationId);
      throw new InvalidStateTransitionError('Transición concurrente detectada: la donación ya fue procesada');
    }

    throw err;
  }
}
