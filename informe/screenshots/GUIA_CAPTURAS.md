# Guía Paso a Paso para la Toma de Screenshots del Informe Técnico
**Plataforma de Donaciones Seguras — «Fundación AQP-SOLIDARIA»**  
*Guarda cada captura con el nombre exacto indicado en la carpeta `informe/screenshots/`. Al reemplazar cada imagen, simplemente ejecuta `typst compile informe/INFORME_LAB04_ZERO_TRUST.typ informe/INFORME_LAB04_ZERO_TRUST.pdf` para regenerar el informe.*

---

## 🏛️ Bloque 1: Consola de AWS (Cloud Infrastructure & Gobernanza)

### 1. `001-setup_aws_budgets.png`
* **Dónde ir:** [Consola de AWS Budgets](https://us-east-1.console.aws.amazon.com/billing/home#/budgets)
* **Qué mostrar:** El presupuesto mensual configurado en **\$1.00 USD** con alertas al 50%, 80% y 100%.
* **Tip:** Enfocar la tarjeta o fila del presupuesto que muestra el balance estimado en \$0.00.

### 2. `002-setup_iam_users.png`
* **Dónde ir:** [Consola de IAM $\to$ Users](https://us-east-1.console.aws.amazon.com/iam/home#/users)
* **Qué mostrar:** La tabla con los 4 usuarios del equipo: `vlad`, `jean`, `jeanpier`, `gonzalo`.
* **Tip:** Mostrar que ninguno usa la cuenta root y que cada uno tiene sus permisos asignados.

### 3. `003-cognito_user_pool.png`
* **Dónde ir:** [Amazon Cognito $\to$ User Pools](https://us-east-2.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-2_jSTLexY2N/groups)
* **Qué mostrar:** El User Pool `us-east-2_jSTLexY2N` mostrando los 3 grupos creados: `DONANTE`, `GESTOR` y `AUDITOR`.

### 4. `004-cognito_mfa_config.png`
* **Dónde ir:** [Amazon Cognito $\to$ Sign-in experience](https://us-east-2.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-2_jSTLexY2N/sign-in)
* **Qué mostrar:** La sección de **Multi-factor authentication (MFA)** configurada con **Authenticator apps (TOTP)** activa.

### 5. `005-apigateway_jwt_authorizer.png`
* **Dónde ir:** [Amazon API Gateway $\to$ HTTP APIs](https://us-east-2.console.aws.amazon.com/apigateway/main/develop/routes?api=evft7i355m&region=us-east-2)
* **Qué mostrar:** La API `evft7i355m` en la pestaña **Authorization**, mostrando el **CognitoJwtAuthorizer** protegiendo las rutas privadas (`POST /v1/donations`, `POST /v1/projects`, etc.).

### 6. `006-dynamodb_tables.png`
* **Dónde ir:** [Amazon DynamoDB $\to$ Tables](https://us-east-2.console.aws.amazon.com/dynamodbv2/home?region=us-east-2#tables)
* **Qué mostrar:** El listado con las 4 tablas creadas: `Projects`, `Donations`, `Idempotency`, `AuditEvents`, en modo de capacidad On-Demand (`PAY_PER_REQUEST`).

### 7. `007-dynamodb_idempotency_ttl.png`
* **Dónde ir:** [Amazon DynamoDB $\to$ Tablas $\to$ Idempotency $\to$ Additional settings](https://us-east-2.console.aws.amazon.com/dynamodbv2/home?region=us-east-2#table?name=Idempotency&tab=additional)
* **Qué mostrar:** La sección **Time to Live (TTL)** mostrando el atributo `expiresAt` en estado **Enabled**.

---

## 🌐 Bloque 2: Repositorio GitHub y CI/CD

### 8. `008-git_branches_prs.png`
* **Dónde ir:** [Pull Requests en GitHub](https://github.com/vhanccos/secure-donations-2026/pulls?q=is%3Apr+is%3Aclosed)
* **Qué mostrar:** Los 4 Pull Requests cerrados/fusionados con los nombres exactos:
  * PR #1 (Vladimir Hancco - `feat/iac-devops-setup`)
  * PR #2 (Jeanpier Valera - `feat/ci-actions-workflow`)
  * PR #3 (Jean Chara - `feat/backend-donations-core`)
  * PR #4 (Gonzalo Layme - `feat/frontend-spa`)

### 9. `009-ci_github_actions.png`
* **Dónde ir:** [GitHub Actions Workflow Runs](https://github.com/vhanccos/secure-donations-2026/actions)
* **Qué mostrar:** El workflow de CI mostrando el check verde con las fases de **SAM validate**, **Typecheck** y **Tests** pasando exitosamente.

---

## 💻 Bloque 3: Frontend SPA (React 19 + Tailwind)

Para abrir la SPA localmente:
```bash
cd /home/vlad/tmp/lab04/frontend
npm run dev
```
Abre en tu navegador `http://localhost:5173`.

### 10. `010-ui_catalogo_publico.png`
* **Qué mostrar:** La página principal con el catálogo público de proyectos sociales (Educación, Comedores, Salud) con sus metas y montos confirmados en PEN.

### 11. `011-ui_donacion_simulada.png`
* **Qué mostrar:** El modal/formulario de donación haciendo clic en **"Donar (Simulación)"**, donde se aprecia claramente el cartel de advertencia académica:
  > *«Simulación académica: no se ha realizado ningún cobro real»*.

### 12. `012-ui_login_mfa_totp.png`
* **Qué mostrar:** El modal de inicio de sesión de Cognito solicitando el código de 6 dígitos de la aplicación autenticadora (TOTP MFA) al entrar como Gestor/Admin.

### 13. `013-ui_historial_propio.png`
* **Qué mostrar:** La vista "Mi Historial" (`/donations/me`) mostrando únicamente las donaciones del usuario autenticado (demostrando prevención de BOLA).

### 14. `014-ui_responsive_375px.png`
* **Cómo tomarla:** En Chrome o Firefox, presiona `F12` $\to$ activa el modo dispositivo $\to$ selecciona **375 px** (iPhone SE).
* **Qué mostrar:** La página del catálogo adaptada de forma responsiva y accesible sin desbordamientos horizontales.

---

## ⚡ Bloque 4: Pruebas de Seguridad en Terminal (T01 a T14)

Puedes ejecutar la suite completa en tu terminal con:
```bash
cd /home/vlad/tmp/lab04/tests
./run-all-tests.sh
```

O tomar las siguientes capturas específicas con comandos cURL directos:

### 15. `015-test_t02_unauthorized.png` (T02 - Petición sin token)
```bash
curl -i -X POST https://evft7i355m.execute-api.us-east-2.amazonaws.com/academic/v1/donations \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test", "amountCents":5000}'
```
* **Qué mostrar:** La respuesta **`HTTP/2 401 Unauthorized`** generada por el JWT Authorizer.

### 16. `016-test_t03_forbidden_role.png` (T03 - Donante creando proyecto)
* **Qué mostrar:** Terminal ejecutando la prueba T03 de `./run-all-tests.sh` mostrando el rechazo con **`HTTP 403 Forbidden`**.

### 17. `017-test_t04_invalid_payload.png` (T04 - Validación Zod)
* **Qué mostrar:** Terminal mostrando el envío de `amountCents: 0` o un valor decimal recibiendo **`HTTP 400 Bad Request`** con error de validación.

### 18. `018-test_t06_t07_idempotencia.png` (T06 y T07 - Idempotencia atómica)
* **Qué mostrar:** Salida del test runner donde:
  * El reintento con la misma clave y payload devuelve la donación en caché (`HTTP 201`).
  * El reintento con misma clave pero payload alterado devuelve **`HTTP 409 Conflict`**.

### 19. `019-test_t08_concurrencia_10_requests.png` (T08 - 10 peticiones paralelas)
* **Qué mostrar:** La sección del test runner de T08 mostrando:
  > `[T08] 10 concurrent simulation calls -> EXACTLY 1 HTTP 200, 9 HTTP 409`.

### 20. `020-test_t09_bola_mitigado.png` (T09 - Mitigación BOLA)
* **Qué mostrar:** Intento de consultar la donación de otro usuario recibiendo **`HTTP 403 / 404`** sin exponer datos privados.

### 21. `021-test_t10_iam_least_privilege.png` (T10 - Mínimo Privilegio IAM)
* **Dónde ir:** [CloudWatch Logs Insights](https://us-east-2.console.aws.amazon.com/cloudwatch/home?region=us-east-2#logsV2:log-groups) en `/aws/lambda/ListProjectsFunction`.
* **Qué mostrar:** Registro de `AccessDeniedException` al verificar que la Lambda de lectura no tiene permisos de escritura en DynamoDB.

### 22. `022-test_t11_id_token_rejected.png` (T11 - Rechazo de ID Token)
* **Qué mostrar:** Petición con un ID Token en lugar de Access Token rechazada con **`HTTP 401 Unauthorized`** por carecer de scopes OAuth.

---

## 📊 Bloque 5: Observabilidad en CloudWatch

### 23. `023-cloudwatch_json_logs.png`
* **Dónde ir:** [CloudWatch Log Groups](https://us-east-2.console.aws.amazon.com/cloudwatch/home?region=us-east-2#logsV2:log-groups) $\to$ `/aws/lambda/CreateDonationFunction`
* **Qué mostrar:** Eventos de log en formato JSON estructurado mostrando campos como `requestId`, `action`, `statusCode`, **evidenciando que los tokens JWT y datos sensibles no se registran en logs**.

### 24. `024-cloudtrail_event_history.png`
* **Dónde ir:** [AWS CloudTrail $\to$ Event history](https://us-east-2.console.aws.amazon.com/cloudtrail/home?region=us-east-2#/events)
* **Qué mostrar:** Pista de auditoría inmutable de AWS con los eventos de despliegue de CloudFormation, DynamoDB y Lambda.
