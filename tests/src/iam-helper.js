/**
 * AWS IAM Policy Simulator Helper (T10 / RNF-HU-03)
 * Empirically validates Least Privilege guardrails for read-only workloads.
 */

import { execSync } from 'node:child_process';
import { CONFIG } from './config.js';

/**
 * Simulates policy actions against the read-only ListProjectsFunction role
 */
export function simulateReadOnlyPolicy() {
  try {
    const roleName = CONFIG.IAM_ROLES.LIST_PROJECTS_ROLE;
    const policyName = CONFIG.IAM_ROLES.LIST_PROJECTS_POLICY;
    const tableArn = CONFIG.IAM_ROLES.PROJECTS_TABLE_ARN;

    const getDocCmd = `aws iam get-role-policy --role-name "${roleName}" --policy-name "${policyName}" --query "PolicyDocument" --output json --region ${CONFIG.AWS_REGION}`;
    const policyDoc = execSync(getDocCmd, { encoding: 'utf8' }).trim();

    const actionsToTest = [
      'dynamodb:GetItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:DeleteItem',
      'dynamodb:BatchWriteItem',
    ];

    const simCmd = `aws iam simulate-custom-policy \
      --policy-input-list '${policyDoc}' \
      --action-names ${actionsToTest.join(' ')} \
      --resource-arns "${tableArn}" \
      --query "EvaluationResults[*].[EvalActionName,EvalDecision]" \
      --output json \
      --region ${CONFIG.AWS_REGION}`;

    const simOutput = execSync(simCmd, { encoding: 'utf8' }).trim();
    const evaluationResults = JSON.parse(simOutput);

    const resultMap = {};
    for (const [action, decision] of evaluationResults) {
      resultMap[action] = decision;
    }

    return {
      success: true,
      roleName,
      policyName,
      resultMap,
      readAllowed:
        resultMap['dynamodb:GetItem'] === 'allowed' &&
        resultMap['dynamodb:Query'] === 'allowed' &&
        resultMap['dynamodb:Scan'] === 'allowed',
      writeDenied:
        resultMap['dynamodb:PutItem'] === 'implicitDeny' &&
        resultMap['dynamodb:UpdateItem'] === 'implicitDeny' &&
        resultMap['dynamodb:DeleteItem'] === 'implicitDeny' &&
        resultMap['dynamodb:BatchWriteItem'] === 'implicitDeny',
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}
