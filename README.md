# Plataforma de Donaciones Seguras («Fundación AQP-SOLIDARIA»)

[![CI Pipeline](https://github.com/vhanccos/secure-donations-2026/actions/workflows/ci.yml/badge.svg)](https://github.com/vhanccos/secure-donations-2026/actions/workflows/ci.yml)
[![AWS SAM](https://img.shields.io/badge/AWS-SAM%20Serverless-orange.svg)](https://aws.amazon.com/serverless/sam/)
[![Zero Trust](https://img.shields.io/badge/NIST-SP%20800--207-blue.svg)](https://csrc.nist.gov/pubs/sp/800/207/final)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Plataforma serverless de recaudación solidaria desarrollada bajo los principios de la **Arquitectura Zero Trust (NIST SP 800-207)** para el curso **Tópicos Avanzados en Ingeniería de Software** de la Escuela Profesional de Ingeniería de Software (EPIS), **Universidad Nacional de San Agustín de Arequipa (UNSA)**.

---

## 🏛️ Equipo de Desarrollo y Roles

| Integrante | Rol | Responsabilidad Principal | Rama Temática |
| :--- | :--- | :--- | :--- |
| **Vladimir Hancco** (`vhanccos`) | Tech Lead & Cloud / DevOps Architect | Infraestructura AWS SAM, API Gateway PEP, Cognito PA, DynamoDB y Políticas IAM de mínimo privilegio | `feat/iac-devops-setup` |
| **Jeanpier Valera** (`jvalera@unsa.edu.pe`) | Security Engineer & CI/CD Specialist | GitHub Actions CI, validación de controles Zero Trust, suite de pruebas automatizadas y matrices de seguridad | `feat/ci-actions-workflow` |
| **Jean Chara** (`jcharaco@unsa.edu.pe`) | Backend Engineer | Lambdas Node.js/TypeScript (PDP), protocolo de idempotencia atómica (`TransactWriteItems`), logging estructurado y validación Zod | `feat/backend-donations-core` |
| **Gonzalo Layme** (`glaymem@unsa.edu.pe`) | Frontend Engineer | SPA React 19 + Tailwind CSS, gestión de JWT volátil en memoria (Zero Storage), UI con banner de simulación académica y MFA interactivo | `feat/frontend-spa` |

---

## 🔒 Arquitectura Zero Trust (NIST SP 800-207)

El diseño desacopla estrictamente los planos de control y de datos, aplicando verificación explícita en cada salto de red:

```text
[ Browser Web SPA (React 19) ]
          │
          │ HTTPS / TLS 1.3 (Volatile in-memory JWT)
          ▼
[ Amazon API Gateway HTTP API v2 (PEP) ] ──(JWKS Token Validation)──> [ Amazon Cognito User Pool (PA) ]
          │ (Claims verificados inyectados)                                - Grupos: DONANTE, GESTOR, AUDITOR
          ▼                                                                - MFA TOTP obligatorio en GESTOR/AUDITOR
[ AWS Lambda Functions (PDP + Business Logic) ]
          │ Node.js 22 + TypeScript + Zod Validation
          ├── DynamoDB TransactWriteItems ──────> [ Amazon DynamoDB (On-Demand) ]
          │                                         - Projects (PK: projectId, GSI: status)
          │                                         - Donations (PK: donationId, GSI: donorSub)
          │                                         - Idempotency (PK: pk, TTL: expiresAt)
          │                                         - AuditEvents (PK: eventType, SK: timestamp#id)
          │
          └── JSON Logs Estructurados ──────────> [ Amazon CloudWatch Logs ]
```

### Componentes Clave del Modelo Zero Trust
1. **Policy Enforcement Point (PEP)**: Amazon API Gateway HTTP API v2 con JWT Authorizer conectado a Amazon Cognito. Valida firma JWKS, emisor (`iss`), audiencia/cliente (`aud`) y scopes OAuth requeridos antes de permitir tráfico a la capa de cómputo.
2. **Policy Decision Point (PDP)**: Módulo de autorización embebido en cada función AWS Lambda (`src/auth/pdp.ts`) que evalúa en tiempo de ejecución las claims verificadas (`sub`, `cognito:groups`) contrastándolas con el recurso destino y la propiedad de los datos (prevención BOLA/IDOR).
3. **Policy Administrator (PA)**: Amazon Cognito User Pool (`us-east-2_jSTLexY2N`) emitiendo credenciales efímeras (tokens JWT con vigencia ≤ 15 minutos), exigiendo MFA TOTP (RFC 6238) para roles con privilegios administrativos (`GESTOR` y `AUDITOR`).
4. **Almacenamiento y Protección de Datos**: 4 tablas DynamoDB en modo On-Demand. Aislamiento estricto de roles IAM por función Lambda con privilegios de mínimo acceso (las funciones de solo lectura tienen denegado `PutItem`/`UpdateItem`/`DeleteItem`).
5. **Idempotencia Atómica**: Transacciones DynamoDB ACID (`TransactWriteItems`) que garantizan la creación no duplicada de intenciones de donación y previenen condiciones de carrera ante reintentos de red.
6. **Minimización de Datos y Simulación**: La plataforma **NUNCA** solicita, transmite ni almacena números de tarjetas de crédito reales ni datos bancarios sensibles. Todas las transacciones son simulaciones académicas explícitas.

---

## 🚀 Infraestructura Desplegada en AWS (Región `us-east-2`)

El stack ha sido desplegado exitosamente mediante **AWS SAM** en el entorno `academic`:

| Recurso Cloud | Identificador / Endpoint | Descripción |
| :--- | :--- | :--- |
| **HTTP API Gateway URL** | `https://evft7i355m.execute-api.us-east-2.amazonaws.com/academic` | Endpoint público del API Gateway PEP |
| **HTTP API ID** | `evft7i355m` | Amazon API Gateway HTTP API v2 |
| **Cognito User Pool ID** | `us-east-2_jSTLexY2N` | Directorio de identidades y Policy Administrator |
| **Cognito Client ID** | `6qc17dq9iqpoqq8e4sk5doqpnn` | Public Web Client con soporte PKCE |
| **Cognito Hosted UI / Domain** | `https://aqp-solidaria-915275802786.auth.us-east-2.amazoncognito.com` | Dominio OAuth 2.0 para autenticación y MFA TOTP |
| **DynamoDB Projects** | `Projects` | Catálogo de proyectos solidarios (GSI: `status-index`) |
| **DynamoDB Donations** | `Donations` | Registro de donaciones simuladas (GSI: `donorSub-index`) |
| **DynamoDB Idempotency** | `Idempotency` | Tabla de control de idempotencia atómica con TTL `expiresAt` |
| **DynamoDB AuditEvents** | `AuditEvents` | Pista de auditoría inmutable de eventos de seguridad |

---

## 📡 Catálogo de Rutas y Contratos de API

| Método | Ruta | Acceso / Rol | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/v1/projects` | Público | Listado de proyectos publicados (`status = PUBLICADO`) |
| `GET` | `/v1/projects/{id}` | Público | Detalle completo de un proyecto |
| `GET` | `/v1/projects/{id}/stats` | Público | Estadísticas agregadas de recaudación confirmada |
| `POST` | `/v1/projects` | `GESTOR` | Creación de borrador de nuevo proyecto |
| `PATCH` | `/v1/projects/{id}/publish` | `GESTOR` | Publicación de proyecto en el catálogo |
| `POST` | `/v1/donations` | `DONANTE` | Registro de intención de donación (requiere `Idempotency-Key`) |
| `POST` | `/v1/donations/{id}/simulate` | `DONANTE` | Confirmación de simulación académica de pago |
| `GET` | `/v1/donations/me` | `DONANTE` | Historial de donaciones filtrado estrictamente por `sub` |
| `GET` | `/v1/audit` | `AUDITOR` | Consulta de bitácora y auditoría de eventos de seguridad |

---

## 🧪 Pruebas Automatizadas y Calidad de Código

El backend cuenta con una suite completa de pruebas unitarias y de integración en **Vitest**:

```bash
# Navegar al directorio de backend
cd backend

# Instalar dependencias
npm install

# Ejecutar verificación de tipos TypeScript
npm run typecheck

# Ejecutar suite de pruebas
npm test
```

### Resultados de Verificación
- **83 pruebas unitarias y de integración** cubriendo:
  - PDP (Policy Decision Point) y validación de claims JWT
  - Idempotencia atómica con DynamoDB `TransactWriteItems`
  - Prevención de BOLA/IDOR en donaciones privadas
  - Validaciones de payloads Zod y esquemas estrictos
  - Manejo estructurado de errores y respuestas HTTP (400, 401, 403, 404, 409)

---

## 🔄 Flujo de Trabajo y Ramas en Git

El desarrollo del proyecto simula un flujo colaborativo mediante ramas de características fusionadas a `main`:

```text
main ───────────────────────────────────●──────────────────●──────────────────●
      \                                /                  /                  /
       └── feat/iac-devops-setup ─────┘                  /                  /
            (Vladimir Hancco - Infraestructura SAM)     /                  /
                                                       /                  /
       └────────────────── feat/ci-actions-workflow ──┘                  /
                           (Jeanpier Valera - CI/CD & Testing)          /
                                                                       /
       └────────────────────────────────── feat/backend-donations-core ┘
                                           (Jean Chara - Backend PDP & Core)
```

---

## 📜 Licencia

Proyecto académico distribuido bajo la Licencia MIT. Consulte el archivo `LICENSE` para más detalles.
