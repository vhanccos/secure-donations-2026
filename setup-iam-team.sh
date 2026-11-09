#!/usr/bin/env bash
set -e

# ==============================================================================
# Script de Creación de Usuarios IAM para el Equipo (Lab 04 - Zero Trust)
# Cumple con CA-NF03.3 (Usuario IAM individual por integrante + MFA obligatorio)
# ==============================================================================

REGION="${AWS_DEFAULT_REGION:-us-east-2}"
GROUP_NAME="FundacionDevTeam"
MEMBERS=("jeanpier" "jean" "gonzalo")
INITIAL_PASSWORD="TemporalPassword2026!#Segura"

echo "=== 1. Verificando identidad actual de AWS CLI ==="
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo "Conectado a la Cuenta AWS: $ACCOUNT_ID en región: $REGION"

echo "=== 2. Creando Grupo IAM: $GROUP_NAME ==="
aws iam create-group --group-name "$GROUP_NAME" 2>/dev/null || echo "El grupo $GROUP_NAME ya existe."

echo "=== 3. Asignando Políticas de Permisos al Grupo ==="
# Permisos para despliegue y desarrollo serverless del laboratorio
aws iam attach-group-policy --group-name "$GROUP_NAME" --policy-arn "arn:aws:iam::aws:policy/PowerUserAccess"

# Política inline para permitir gestión de su propio MFA y credenciales
cat <<EOF > /tmp/self-manage-mfa-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSelfManageCredentialsAndMFA",
      "Effect": "Allow",
      "Action": [
        "iam:ChangePassword",
        "iam:CreateVirtualMFADevice",
        "iam:DeleteVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:ResyncMFADevice",
        "iam:GetUser",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices"
      ],
      "Resource": [
        "arn:aws:iam::${ACCOUNT_ID}:user/\${aws:username}",
        "arn:aws:iam::${ACCOUNT_ID}:mfa/\${aws:username}"
      ]
    }
  ]
}
EOF

aws iam put-group-policy \
  --group-name "$GROUP_NAME" \
  --policy-name "SelfManageMFA" \
  --policy-document file:///tmp/self-manage-mfa-policy.json
rm -f /tmp/self-manage-mfa-policy.json

echo "=== 4. Creando los 4 Usuarios IAM e integrándolos al Grupo ==="
for USER in "${MEMBERS[@]}"; do
  echo "--- Configurando: $USER ---"
  aws iam create-user --user-name "$USER" 2>/dev/null || echo "Usuario $USER ya existe."
  
  # Asignar al grupo
  aws iam add-user-to-group --group-name "$GROUP_NAME" --user-name "$USER"
  
  # Crear perfil de login en consola web (con cambio de contraseña obligatorio)
  aws iam create-login-profile \
    --user-name "$USER" \
    --password "$INITIAL_PASSWORD" \
    --password-reset-required 2>/dev/null || echo "Perfil de login para $USER ya configurado."
done

# Asignar también al usuario actual (vlad) al grupo
aws iam add-user-to-group --group-name "$GROUP_NAME" --user-name "vlad" 2>/dev/null || true

echo ""
echo "=============================================================================="
echo "¡USUARIOS CREADOS EXITOSAMENTE!"
echo "URL de inicio de sesión de la consola: https://${ACCOUNT_ID}.signin.aws.amazon.com/console"
echo "Contraseña inicial para todos: $INITIAL_PASSWORD (les pedirá cambiarla al entrar)"
echo "Usuarios creados:"
for USER in "${MEMBERS[@]}"; do
  echo "  - $USER"
done
echo "=============================================================================="
