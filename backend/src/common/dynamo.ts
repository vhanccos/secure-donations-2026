/**
 * Shared DynamoDB DocumentClient Singleton & Table Constants
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const rawClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

export const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export const TABLES = {
  PROJECTS: process.env.PROJECTS_TABLE || 'Projects',
  DONATIONS: process.env.DONATIONS_TABLE || 'Donations',
  IDEMPOTENCY: process.env.IDEMPOTENCY_TABLE || 'Idempotency',
  AUDIT_EVENTS: process.env.AUDIT_EVENTS_TABLE || 'AuditEvents',
};
