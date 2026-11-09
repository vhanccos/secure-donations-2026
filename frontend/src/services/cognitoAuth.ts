import { DirectAuthStep1Result } from '../types/auth';

export const COGNITO_REGION = import.meta.env.VITE_COGNITO_REGION || 'us-east-2';
export const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-2_jSTLexY2N';
export const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '6qc17dq9iqpoqq8e4sk5doqpnn';
const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

async function callCognitoIdp<T>(target: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorType = (data.__type || data.code || 'AuthError').split('#').pop();
    let message = data.message || 'Error en autenticación con Cognito';
    if (errorType === 'NotAuthorizedException') {
      message = 'Usuario o contraseña incorrectos.';
    } else if (errorType === 'UserNotFoundException') {
      message = 'El usuario especificado no existe.';
    } else if (errorType === 'CodeMismatchException') {
      message = 'Código MFA inválido o expirado. Verifique su app autenticadora.';
    } else if (errorType === 'ExpiredCodeException') {
      message = 'El código MFA ha expirado. Intente nuevamente.';
    }
    throw new Error(message);
  }

  return data as T;
}

export async function loginStep1Credentials(
  email: string,
  pass: string
): Promise<DirectAuthStep1Result> {
  interface InitiateAuthResponse {
    ChallengeName?: string;
    Session?: string;
    AuthenticationResult?: {
      AccessToken: string;
      IdToken: string;
      RefreshToken?: string;
      ExpiresIn?: number;
    };
  }

  const result = await callCognitoIdp<InitiateAuthResponse>('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: pass,
    },
  });

  if (result.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
    return {
      step: 'MFA_CHALLENGE',
      session: result.Session,
      challengeName: result.ChallengeName,
    };
  }

  if (result.AuthenticationResult) {
    return {
      step: 'COMPLETED',
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
    };
  }

  throw new Error(`Desafío no soportado por la aplicación: ${result.ChallengeName || 'DESCONOCIDO'}`);
}

export async function loginStep2VerifyMfa(
  email: string,
  session: string,
  totpCode: string
): Promise<{ accessToken: string; idToken: string; refreshToken?: string }> {
  interface RespondToAuthChallengeResponse {
    AuthenticationResult?: {
      AccessToken: string;
      IdToken: string;
      RefreshToken?: string;
      ExpiresIn?: number;
    };
  }

  const result = await callCognitoIdp<RespondToAuthChallengeResponse>('RespondToAuthChallenge', {
    ClientId: CLIENT_ID,
    ChallengeName: 'SOFTWARE_TOKEN_MFA',
    Session: session,
    ChallengeResponses: {
      USERNAME: email,
      SOFTWARE_TOKEN_MFA_CODE: totpCode,
    },
  });

  if (!result.AuthenticationResult?.AccessToken || !result.AuthenticationResult?.IdToken) {
    throw new Error('Fallo de verificación MFA: No se emitieron credenciales');
  }

  return {
    accessToken: result.AuthenticationResult.AccessToken,
    idToken: result.AuthenticationResult.IdToken,
    refreshToken: result.AuthenticationResult.RefreshToken,
  };
}
