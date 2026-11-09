# Test Readiness & E2E Verification Report (`TEST_READY.md`)

**Plataforma de Donaciones Seguras («Fundación AQP-SOLIDARIA»)**  
**Versión:** 2.0 | **Fecha:** 2026-11-09 | **Modelo de Seguridad:** Zero Trust (NIST SP 800-207)  
**Entorno de Ejecución:** AWS Cloud `us-east-2` (Capa Gratuita / Free Tier)  
**Estado:** **PASSED (100% OK — VERDICT: APPROVED)**

---

## 1. Información General del Entorno Bajo Prueba

El conjunto de pruebas automatizado de caja opaca (opaque-box) opera de forma directa contra los servicios e infraestructura desplegados en AWS:

- **API Gateway Base URL (PEP):** `https://evft7i355m.execute-api.us-east-2.amazonaws.com/academic`
- **Cognito User Pool ID (PA):** `us-east-2_jSTLexY2N`
- **Cognito App Client ID:** `6qc17dq9iqpoqq8e4sk5doqpnn`
- **Cognito Hosted UI / Auth Domain:** `https://aqp-solidaria-915275802786.auth.us-east-2.amazoncognito.com`
- **Región AWS:** `us-east-2`
- **Cómputo Backend (PDP):** AWS Lambda (Node.js 24 + TypeScript)
- **Persistencia:** Amazon DynamoDB (4 tablas: `Projects`, `Donations`, `Idempotency`, `AuditEvents`)
- **Roles de Prueba Autenticados:**
  - `challenger_donante_a@aqp-solidaria.org` (`DONANTE`, sub: `419be540-0081-70f2-11e4-dfe2dc29491e`)
  - `challenger_donante_b@aqp-solidaria.org` (`DONANTE`, sub: `312be530-2041-70e5-a5d9-5045560edd6b`)
  - `challenger_gestor@aqp-solidaria.org` (`GESTOR`, sub: `212b35b0-f011-706a-2882-0edd0f1c0550`)
  - `challenger_auditor@aqp-solidaria.org` (`AUDITOR`, sub: `d15b8510-9091-703c-ed9d-947ebf355072`)
  - `test_gestor_m3@unsa.edu.pe` (`GESTOR` con TOTP MFA obligatorio configurado)

---

## 2. Invocación del Ejecutor de Pruebas (Test Runner)

El arnés de pruebas cuenta con un ejecutor global independiente y soporte para ejecución por niveles (tiers).

### 2.1 Ejecución Global Automatizada
```bash
# Ejecutor standalone bash (retorna código de salida 0 en éxito total)
bash /home/vlad/tmp/lab04/tests/run-all-tests.sh
```

### 2.2 Ejecución mediante NPM
```bash
cd /home/vlad/tmp/lab04/tests
npm test
```

### 2.3 Ejecución Modular por Tier
```bash
# Tier 1: Descubrimiento público y aislamiento de catálogo (T01)
node tests/e2e/tier1-public-discovery.test.js

# Tier 2: Autenticación, tokens JWT, revocación y MFA (T02, T11, T13, T14)
node tests/e2e/tier2-auth-security.test.js

# Tier 3: Segregación RBAC, BOLA/IDOR y límites de rol (T03, T09, T12)
node tests/e2e/tier3-rbac-bola.test.js

# Tier 4: Idempotencia atómica, validaciones, concurrencia masiva y privilegio IAM (T04, T05, T06, T07, T08, T10)
node tests/e2e/tier4-integrity-concurrency.test.js
```

---

## 3. Matriz de Casos de Prueba (T01 a T14 y Tiers 1-4)

| ID | Tier | Escenario de Prueba | Ruta / Componente | Trazabilidad Requerimientos | Resultado | Estado |
|---|:---:|---|---|---|:---:|:---:|
| **T01** | Tier 1 | Visitante consulta catálogo público; excluye borradores y devuelve HTTP 200 | `GET /v1/projects`<br>`GET /v1/projects/{id}` | CA-01.1, CA-01.2, CA-02.1, CA-02.2, HU-01, HU-02 | 200 OK (Solo proyectos PUBLICADO; borradores omitidos y 404 en detalle) | **PASS** |
| **T02** | Tier 2 | Intento de realizar mutación o consultar datos privados sin token Authorization Bearer | `POST /v1/donations`<br>`GET /v1/donations/me`<br>`POST /v1/projects`<br>`PATCH /v1/projects/{id}/publish`<br>`POST /v1/donations/{id}/simulate`<br>`GET /v1/audit` | CA-03.2, RNF-HU-02 | 401 Unauthorized en el PEP (`www-authenticate: Bearer`), sin ejecución de Lambda | **PASS** |
| **T03** | Tier 3 | Donante autenticado intenta crear o publicar proyecto privado de gestor | `POST /v1/projects`<br>`PATCH /v1/projects/{id}/publish` | CA-04.1, HU-04 | 403 Forbidden (`code: FORBIDDEN`, requiere GESTOR) | **PASS** |
| **T04** | Tier 4 | Validación estricta de payloads: montos 0, 99, 100001, negativos, float o clave faltante | `POST /v1/donations` | CA-05.2, HU-05 | 400 Bad Request validado por Zod; 404 si el proyecto no existe | **PASS** |
| **T05** | Tier 4 | Donante crea intención de donación válida con clave UUID de idempotencia | `POST /v1/donations` | CA-05.1, CA-05.3, HU-05 | 201 Created (`PENDIENTE_SIMULACION`, sin datos bancarios reales, aviso de simulación) | **PASS** |
| **T06** | Tier 4 | Reenvío de solicitud con misma clave de idempotencia y payload idéntico | `POST /v1/donations` | CA-05.4, RNF-HU-04 | 201 Created (respuesta previa en caché, sin duplicar donación en DynamoDB) | **PASS** |
| **T07** | Tier 4 | Reenvío de clave de idempotencia existente con payload modificado (hash mismatch) | `POST /v1/donations` | CA-05.4, RNF-HU-04 | 409 Conflict (`code: CONFLICT`, parámetros modificados detectados) | **PASS** |
| **T08** | Tier 4 | Concurrencia masiva: 10 peticiones simultáneas confirmando la misma donación | `POST /v1/donations/{id}/simulate` | CA-06.2, CA-NF04.1, CA-NF04.2 | Exactamente 1 HTTP 200 y 9 HTTP 409; acumulado se incrementa una sola vez | **PASS** |
| **T09** | Tier 3 | BOLA / IDOR: Donante intenta consultar o modificar donación perteneciente a otro donante | `POST /v1/donations/{id}/simulate`<br>`GET /v1/donations/me` | CA-07.1, CA-07.2, HU-07 | 403 Forbidden en simulación ajena; historial personal aísla 100% de registros por `sub` | **PASS** |
| **T10** | Tier 4 | Mínimo privilegio IAM: Lambda de lectura intenta escribir en DynamoDB | IAM Policy Simulator / `ListProjectsFunctionRole` | CA-NF03.1, RNF-HU-03 | `implicitDeny` en PutItem/UpdateItem/DeleteItem; GetItem/Query/Scan `allowed` | **PASS** |
| **T11** | Tier 2 | Token manipulado/firmado con clave inválida o Cognito ID Token usado como Bearer | Todas las rutas privadas | CA-03.2, CA-NF02.1 | 401 en tokens corruptos/firma inválida; 403 `insufficient_scope` en ID tokens | **PASS** |
| **T12** | Tier 3 | Segregación bidireccional entre roles: Gestor consulta historial o Donante consulta auditoría | `GET /v1/donations/me`<br>`GET /v1/audit` | CA-04.2, CA-10.1, HU-04, HU-10 | 403 Forbidden en accesos cruzados no autorizados | **PASS** |
| **T13** | Tier 2 | Token con expiración vencida o revocado | `GET /v1/donations/me`<br>`/oauth2/revoke` | CA-03.3, CA-03.4 | 401 en tokens expirados; revocación de refresh token deshabilita renovación (400 invalid_grant) | **PASS** |
| **T14** | Tier 2 | Usuario GESTOR o AUDITOR con MFA obligatorio inicia sesión sin segundo factor | `initiate-auth` (Cognito USER_PASSWORD_AUTH) | CA-11.1, CA-11.2, HU-11 | Retorna desafío `SOFTWARE_TOKEN_MFA`; cero tokens emitidos sin TOTP válido | **PASS** |

---

## 4. Desglose Detallado por Niveles (Tiers 1 a 4)

### Tier 1 — Superficie Pública y Descubrimiento (8/8 PASS)
1. **T01.1 (HU-01):** `GET /v1/projects` devuelve HTTP 200 y listado de proyectos.
2. **T01.2 (CA-01.2):** Garantiza que todos los registros en el catálogo posean estado `PUBLICADO`.
3. **T01.3 (RNF-HU-01):** Verifica cabeceras de respuesta Zero Trust: `nosniff`, `DENY`, `strict-transport-security` y `no-store`.
4. **T01.4 (HU-02):** `GET /v1/projects/{id}` devuelve detalle completo de proyectos publicados.
5. **T01.5 (CA-02.2):** Proyectos con ID inexistente devuelven HTTP 404 `NOT_FOUND`.
6. **T01.6 (CA-01.2):** Creación de un proyecto en `BORRADOR` por el Gestor verifica que el borrador no aparezca en el catálogo y devuelva 404 al consultarse públicamente.
7. **T01.7 (HU-08):** Al publicarse el borrador, este se incorpora de forma inmediata y consistente al catálogo.
8. **T01.8 (HU-09):** `GET /v1/projects/{id}/stats` retorna agregados financieros calculados (`goalAmountCents`, `confirmedAmountCents`, `percentageCompleted`).

### Tier 2 — Autenticación, Tokens JWT, Revocación y MFA (21/21 PASS)
1. **T02.1 a T02.6 (CA-03.2):** Barrido no autenticado en los 6 endpoints privados (`/donations`, `/donations/me`, `/projects`, `/projects/publish`, `/donations/simulate`, `/audit`), todos rechazados con HTTP 401 y desafío `Bearer`.
2. **T11.1 a T11.4 (CA-NF02.1):** Pruebas de tokens corruptos: Bearer vacío (401), basura aleatoria (401), firma alterada (401 verification error), ataque `alg: none` (401).
3. **T11.ID_1 a T11.ID_6 (CA-03.2):** Token ID de Cognito (con firma y emisor válidos pero sin custom scopes OAuth de Resource Server) enviado a rutas privadas; API Gateway PEP rechaza el 100% de las peticiones con HTTP 403 `insufficient_scope`.
4. **T13.1 (CA-03.2):** Token con claim `exp` en el pasado es rechazado con HTTP 401.
5. **T13.2 (CA-03.3):** Revocación de refresh token mediante endpoint `/oauth2/revoke` de Cognito; el intento de renovación posterior falla con HTTP 400 `invalid_grant`.
6. **T13.3 (CA-03.4):** Verificación de configuración en Cognito: validez máxima de access token fijada en 15 minutos (`AccessTokenValidity: 15`).
7. **T14.1 (CA-11.2):** Usuario `test_gestor_m3@unsa.edu.pe` (rol GESTOR con MFA TOTP activo) inicia flujo de autenticación por contraseña; Cognito responde con desafío `SOFTWARE_TOKEN_MFA` y sesión criptográfica, sin entregar access tokens ni ID tokens.
8. **T14.2 (HU-11):** Intento de responder al desafío con código TOTP erróneo (`000000`) es rechazado por Cognito con `CodeMismatchException`.

### Tier 3 — Autorización RBAC, BOLA/IDOR y Segregación de Roles (10/10 PASS)
1. **T03.1 (CA-04.1):** Donante intentando invocar `POST /v1/projects` recibe HTTP 403 Forbidden.
2. **T03.2 (CA-04.1):** Donante intentando invocar `PATCH /v1/projects/{id}/publish` recibe HTTP 403 Forbidden.
3. **T09.1 (CA-05.1):** Donante A crea intención de donación `PENDIENTE_SIMULACION` (S/ 50.00).
4. **T09.2 (CA-07.2):** Donante B intenta ejecutar `POST /v1/donations/{idA}/simulate` (Ataque BOLA); el backend Lambda (PDP) valida `assertOwner` y responde HTTP 403 Forbidden (`Acceso denegado: no es propietario de esta donación`).
5. **T09.3 (CA-07.1):** Donante B consulta su historial `GET /v1/donations/me`; la donación de Donante A es totalmente invisible (`count: 0` o solo donaciones propias).
6. **T09.4 (CA-06.1):** Propietario legítimo (Donante A) confirma su donación exitosamente (HTTP 200, `CONFIRMADA_SIMULADA`).
7. **T12.1 (CA-04.2):** Gestor intentando consultar `GET /v1/donations/me` recibe HTTP 403 Forbidden (`DONANTE` requerido).
8. **T12.2 (CA-10.1):** Donante intentando consultar `GET /v1/audit` recibe HTTP 403 Forbidden (`AUDITOR` requerido).
9. **T12.3 (CA-10.1):** Gestor intentando consultar `GET /v1/audit` recibe HTTP 403 Forbidden (`AUDITOR` requerido).
10. **T12.4 (CA-10.1):** Auditor autenticado consulta `GET /v1/audit` y obtiene HTTP 200 con eventos inmutables.

### Tier 4 — Integridad de Datos, Idempotencia, Concurrencia y Privilegio IAM (16/16 PASS)
1. **T04.1 a T04.9 (CA-05.2):** Batería de validación de datos en `POST /v1/donations`:
   - Monto 0 -> 400 Bad Request
   - Monto 99 (< S/ 1.00) -> 400 Bad Request
   - Monto 100001 (> S/ 1,000.00) -> 400 Bad Request
   - Monto negativo (-500) -> 400 Bad Request
   - Monto float con decimales (50.5) -> 400 Bad Request
   - Body sin amountCents -> 400 Bad Request
   - Falta cabecera Idempotency-Key -> 400 Bad Request
   - Idempotency-Key no es UUID -> 400 Bad Request
   - Proyecto inexistente -> 404 Not Found
2. **T05.1 (CA-05.1):** Registro de intención de donación válida con UUID v4 (HTTP 201 Created).
3. **T06.1 (CA-05.4):** Reenvío con clave idéntica y payload idéntico retorna respuesta en caché (HTTP 201) con el mismo `donationId`.
4. **T07.1 (CA-05.4):** Reenvío con clave existente pero payload modificado (monto alterado) genera colisión de hash SHA-256 en `TransactWriteItems` y retorna HTTP 409 Conflict.
5. **T08.1 (CA-06.2):** Prueba de estrés de 10 peticiones concurrentes simultáneas confirmando la misma donación (`Promise.all`): exactamente 1 solicitud retorna HTTP 200 y las 9 restantes retornan HTTP 409 Conflict.
6. **T08.2 (CA-NF04.1):** Verificación de balance acumulado del proyecto: se incrementa exactamente S/ 50.00 (5,000 céntimos) una sola vez (cero doble conteo).
7. **T10.1 (CA-NF03.1):** Simulación IAM confirma que `ListProjectsFunctionRole` tiene permitido `GetItem`, `Query` y `Scan`.
8. **T10.2 (CA-NF03.1):** Simulación IAM confirma que `ListProjectsFunctionRole` recibe `implicitDeny` en `PutItem`, `UpdateItem`, `DeleteItem` y `BatchWriteItem`, garantizando el principio de menor privilegio en funciones de lectura.

---

## 5. Resumen Consolidado de Ejecución

```text
==============================================================================
   FUNDACIÓN AQP-SOLIDARIA — AUTOMATED E2E ZERO TRUST TEST SUITE
   NIST SP 800-207 Conformance & OWASP Top 10 API Security Verification
==============================================================================
 Target API:       https://evft7i355m.execute-api.us-east-2.amazonaws.com/academic
 User Pool ID:     us-east-2_jSTLexY2N
 App Client ID:    6qc17dq9iqpoqq8e4sk5doqpnn
 AWS Region:       us-east-2
==============================================================================
 • Tier 1: Public Discovery & Catalog              : 8/8 PASS
 • Tier 2: Authentication & Token Security         : 21/21 PASS
 • Tier 3: RBAC & BOLA / IDOR Defense              : 10/10 PASS
 • Tier 4: Integrity, Idempotency & Concurrency    : 16/16 PASS
──────────────────────────────────────────────────────────────────────────────
 Total Scenarios Executed:  55
 Passed:                    55
 Failed:                    0
 Success Rate:              100.0%
 Overall Execution Time:    ~25.5s
 Final Verdict:             ALL TESTS PASSED (APPROVED)
==============================================================================
```

---

## 6. Mapeo a los Principios NIST SP 800-207

| Principio NIST | Control Implementado | Evidencia en Pruebas |
|---|---|---|
| **1. Todo recurso es una entidad de datos o servicio** | Granularidad por endpoint HTTP y tabla DynamoDB | T01, T02, T10 |
| **2. Toda comunicación es asegurada sin importar red** | TLS 1.3 / HTTPS obligatorio; cabeceras CSP, HSTS y nosniff | T01.3 |
| **3. Acceso por sesión y recurso individual** | Access tokens ≤ 15 min, ownership estricto por `sub` | T09, T11, T13 |
| **4. Políticas de acceso dinámicas** | Evaluación de claims verificados, scopes y estado de proyecto en PDP | T03, T12 |
| **5. Monitoreo continuo de activos** | Logs estructurados sin secretos en CloudWatch, CloudTrail habilitado | T10, Auditoría |
| **6. Autenticación y autorización estrictas antes de acceso** | JWT Authorizer en PEP + verificación en PDP + MFA TOTP en roles privilegiados | T02, T11, T14 |
| **7. Recolección de telemetría para mejora de seguridad** | `AuditEvents` inmutables en DynamoDB y trazabilidad por `requestId` | T12.4 |

---

## 7. Conclusión de Certificación

La suite de pruebas automatizada de extremo a extremo certifica que la **Plataforma de Donaciones Seguras («Fundación AQP-SOLIDARIA»)** satisface el 100% de los criterios de aceptación funcionales y no funcionales (T01 a T14) definidos en `requirements.md` y `design.md`.

- **Cero simulaciones ficticias:** Todas las aserciones son de caja opaca, interactuando con la API Gateway desplegada, Cognito y DynamoDB en AWS `us-east-2`.
- **Integridad y consistencia:** Se demostró atomicidad ante concurrencia masiva (T08), aislamiento ante ataques BOLA (T09), protección de privilegios IAM (T10), e inviolabilidad del segundo factor MFA TOTP (T14).
- **Entregable listo para integración:** El comando `bash tests/run-all-tests.sh` ejecuta la totalidad de las pruebas y finaliza con código de salida 0.
