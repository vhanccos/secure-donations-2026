# Plan de Capturas de Pantalla (Screenshots) para el Informe Técnico
**Laboratorio 04: Plataforma de Donaciones Seguras con Modelo Zero Trust**  
**Ubicación de guardado:** `informe/screenshots/`  
**Formato sugerido:** PNG (resolución clara, recortadas al área de interés)

---

## 1. Configuración de Entorno y Gobernanza AWS (Día 1 - Vladimir Hancco)
- **`001-setup_aws_budgets.png`**  
  *Qué capturar:* Consola de AWS Budgets mostrando el presupuesto mensual configurado en **$1.00 USD** con alertas al 50%, 80% y 100%.  
  *Objetivo:* Evidenciar control financiero y restricción de cuenta Free Tier ([RNF-HU-09](file:///home/vlad/tmp/lab04/requirements.md#L153)).
- **`002-setup_iam_users.png`**  
  *Qué capturar:* Consola de IAM en la sección **Users**, mostrando los 4 integrantes (`vlad`, `jeanpier`, `jean`, `gonzalo`) con políticas asignadas.  
  *Objetivo:* Evidenciar cumplimiento de [CA-NF03.3](file:///home/vlad/tmp/lab04/requirements.md#L131) (usuario IAM individual por integrante, sin usar root).

---

## 2. Identidad y Control de Acceso (Jeanpier)
- **`003-cognito_user_pool.png`**  
  *Qué capturar:* Consola de Amazon Cognito mostrando el User Pool `FundacionUserPool` con los grupos `DONANTE`, `GESTOR`, `AUDITOR`.
- **`004-cognito_mfa_config.png`**  
  *Qué capturar:* Configuración de autenticación en Cognito con **MFA TOTP** activado y App Client configurado con **Authorization Code + PKCE** (secret hash deshabilitado).
- **`005-apigateway_jwt_authorizer.png`**  
  *Qué capturar:* Consola de API Gateway (HTTP API) en la pestaña **Authorization**, mostrando el JWT Authorizer apuntando al emisor de Cognito con los Scopes configurados en las rutas protegidas.

---

## 3. Persistencia e Infraestructura de Datos (Jean Chara & Vladimir Hancco)
- **`006-dynamodb_tables.png`**  
  *Qué capturar:* Consola de DynamoDB con las 4 tablas creadas (`Projects`, `Donations`, `Idempotency`, `AuditEvents`) en modo On-Demand (`PAY_PER_REQUEST`).
- **`007-dynamodb_idempotency_ttl.png`**  
  *Qué capturar:* Detalle de la tabla `Idempotency` mostrando el atributo TTL (`expiresAt`) habilitado.

---

## 4. Desarrollo Colaborativo y CI/CD (Equipo)
- **`008-git_branches_prs.png`**  
  *Qué capturar:* Vista en GitHub (o `git log --graph --oneline`) mostrando las ramas creadas por cada integrante (`feat/iac-devops`, `feat/cognito-security`, `feat/backend-donations`, `feat/frontend-spa`) y los Pull Requests asociados.
- **`009-ci_github_actions.png`**  
  *Qué capturar:* Pestaña **Actions** en GitHub con el workflow de CI en verde ejecutando `lint`, `typecheck`, `test` y `build`.

---

## 5. Experiencia de Usuario y Frontend SPA (Gonzalo)
- **`010-ui_catalogo_publico.png`**  
  *Qué capturar:* Navegador mostrando el catálogo público de proyectos en estado `PUBLICADO` con su meta en PEN y monto recaudado simulado (HU-01, CA-01.1).
- **`011-ui_donacion_simulada.png`**  
  *Qué capturar:* Modal o pantalla de donación con el banner visible: *"Simulación académica: no se ha realizado ningún cobro"* e inputs validados en PEN (HU-05, HU-06).
- **`012-ui_login_mfa_totp.png`**  
  *Qué capturar:* Pantalla de Cognito solicitando el código de 6 dígitos de la app autenticadora (Google Authenticator) para un usuario `GESTOR` (HU-11, T14).
- **`013-ui_historial_propio.png`**  
  *Qué capturar:* Vista "Mi Historial" mostrando únicamente las donaciones asociadas al `sub` del donante autenticado (HU-07).
- **`014-ui_responsive_375px.png`**  
  *Qué capturar:* DevTools de Chrome inspeccionando la SPA en modo móvil a **375 px** de ancho (iPhone SE / estándar móvil), verificando legibilidad y usabilidad (RNF-HU-06).

---

## 6. Demostración de Pruebas de Seguridad Negativas T01 a T14 (Jean Chara & Vladimir Hancco)
*(Estas capturas se tomarán de la terminal al correr el script automatizado `run-security-tests.sh` o desde Postman/Bruno)*

- **`015-test_t02_unauthorized.png`**  
  *Qué capturar:* Terminal ejecutando `POST /v1/donations` sin header `Authorization`, recibiendo **HTTP 401 Unauthorized** (T02).
- **`016-test_t03_forbidden_role.png`**  
  *Qué capturar:* Terminal ejecutando `POST /v1/projects` con token de un `DONANTE`, recibiendo **HTTP 403 Forbidden** (T03).
- **`017-test_t04_invalid_payload.png`**  
  *Qué capturar:* Terminal enviando `amountCents: 0` o un valor float, recibiendo **HTTP 400 Bad Request** validado por Zod (T04).
- **`018-test_t06_t07_idempotencia.png`**  
  *Qué capturar:* Terminal mostrando: (1) Reintento idéntico devolviendo la donación previa en caché (T06); (2) Reintento con misma clave pero monto alterado devolviendo **HTTP 409 Conflict** (T07).
- **`019-test_t08_concurrencia_10_requests.png`**  
  *Qué capturar:* Salida del script lanzando 10 peticiones paralelas de confirmación simulada contra la misma donación: exactamente **1 HTTP 200 y 9 HTTP 409**, demostrando atomicidad en DynamoDB (T08).
- **`020-test_t09_bola_mitigado.png`**  
  *Qué capturar:* Donante A intentando consultar `GET /v1/donations/{id}` perteneciente a Donante B, recibiendo **HTTP 403/404** sin filtrar información (T09).
- **`021-test_t10_iam_least_privilege.png`**  
  *Qué capturar:* CloudWatch Logs mostrando que la Lambda de listado de proyectos arrojó `AccessDeniedException` al intentar escribir en DynamoDB (T10).
- **`022-test_t11_id_token_rejected.png`**  
  *Qué capturar:* Enviar un ID Token en lugar de un Access Token a una ruta protegida, recibiendo **HTTP 401 Unauthorized** debido a la falta de scopes (T11).

---

## 7. Observabilidad y Auditoría (Jeanpier Valera & Vladimir Hancco)
- **`023-cloudwatch_json_logs.png`**  
  *Qué capturar:* Consola de CloudWatch Logs mostrando eventos en formato JSON estructurado con `requestId`, código HTTP y acción, **verificando que no hay tokens JWT ni secretos** (RNF-HU-07).
- **`024-cloudtrail_event_history.png`**  
  *Qué capturar:* Historial de eventos de CloudTrail evidenciando las acciones de infraestructura y despliegue SAM.
