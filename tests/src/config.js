/**
 * Configuration for E2E Test Suite (Tiers 1-4, T01-T14)
 * Plataforma de Donaciones Seguras («Fundación AQP-SOLIDARIA»)
 */

export const CONFIG = {
  // Live API Gateway endpoint
  API_BASE_URL:
    process.env.API_BASE_URL ||
    process.env.API_GATEWAY_URL ||
    process.env.VITE_API_BASE_URL ||
    'https://evft7i355m.execute-api.us-east-2.amazonaws.com/academic',

  // AWS Region
  AWS_REGION: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2',

  // Amazon Cognito User Pool and App Client
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || 'us-east-2_jSTLexY2N',
  COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || '6qc17dq9iqpoqq8e4sk5doqpnn',
  COGNITO_DOMAIN:
    process.env.COGNITO_DOMAIN ||
    'https://aqp-solidaria-915275802786.auth.us-east-2.amazoncognito.com',
  REDIRECT_URI: process.env.REDIRECT_URI || 'http://localhost:5173',

  // OAuth Scopes
  ALL_SCOPES:
    'openid email profile api/projects.write api/donations.write api/donations.read api/audit.read',

  // Test Principals
  USERS: {
    DONANTE_A: {
      email: process.env.TEST_DONOR_A_EMAIL || 'challenger_donante_a@aqp-solidaria.org',
      password: process.env.TEST_DONOR_A_PASSWORD || 'TestPassword123!',
      role: 'DONANTE',
      expectedSub: '419be540-0081-70f2-11e4-dfe2dc29491e',
    },
    DONANTE_B: {
      email: process.env.TEST_DONOR_B_EMAIL || 'challenger_donante_b@aqp-solidaria.org',
      password: process.env.TEST_DONOR_B_PASSWORD || 'TestPassword123!',
      role: 'DONANTE',
      expectedSub: '312be530-2041-70e5-a5d9-5045560edd6b',
    },
    GESTOR: {
      email: process.env.TEST_GESTOR_EMAIL || 'challenger_gestor@aqp-solidaria.org',
      password: process.env.TEST_GESTOR_PASSWORD || 'TestPassword123!',
      role: 'GESTOR',
      expectedSub: '212b35b0-f011-706a-2882-0edd0f1c0550',
    },
    AUDITOR: {
      email: process.env.TEST_AUDITOR_EMAIL || 'challenger_auditor@aqp-solidaria.org',
      password: process.env.TEST_AUDITOR_PASSWORD || 'TestPassword123!',
      role: 'AUDITOR',
      expectedSub: 'd15b8510-9091-703c-ed9d-947ebf355072',
    },
    GESTOR_MFA: {
      email: process.env.TEST_GESTOR_MFA_EMAIL || 'test_gestor_m3@unsa.edu.pe',
      password: process.env.TEST_GESTOR_MFA_PASSWORD || 'TestPassword123!',
      role: 'GESTOR',
      expectedSub: '619ba530-f031-700e-3bb7-5332854e27af',
    },
  },

  // IAM Role Physical Names for Least Privilege Testing (T10)
  IAM_ROLES: {
    LIST_PROJECTS_ROLE:
      process.env.LIST_PROJECTS_ROLE ||
      'secure-donations-dev-ListProjectsFunctionRole-KlfVUFpT0fTa',
    LIST_PROJECTS_POLICY: 'ListProjectsFunctionRolePolicy0',
    PROJECTS_TABLE_ARN:
      process.env.PROJECTS_TABLE_ARN ||
      'arn:aws:dynamodb:us-east-2:915275802786:table/Projects',
  },
};
