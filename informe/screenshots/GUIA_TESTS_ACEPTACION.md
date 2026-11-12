# GUÍA DE CAPTURAS: PRUEBAS DE ACEPTACIÓN EN VIVO (T01 A T14)
**Plataforma de Donaciones Seguras — «Fundación AQP-SOLIDARIA» (NIST SP 800-207)**

Para capturar la evidencia de los tests de aceptación exigidos en **requirements.md (§6)**, hemos preparado la herramienta especializada:
```bash
node tests/run-single-test.js <ID>
```
Esta herramienta ejecuta las pruebas directamente contra los **endpoints reales de AWS (API Gateway + Cognito + DynamoDB)** con una presentación formateada de terminal lista para captura clara y profesional.

---

## 📋 Matriz de Casos de Prueba de Aceptación (requirements.md §6)

| Test ID | Escenario Evaluado | Resultado Esperado | Trazabilidad | Comando para Ejecutar y Capturar | Archivo Destino |
|:---:|---|---|---|---|---|
| **T01** | Visitante consulta proyectos y detalle | HTTP 200 catálogo limpio, 404 para borradores | CA-01.1, CA-01.2, CA-02.1 | `node tests/run-single-test.js T01` | `informe/screenshots/014-test_t01_catalogo.png` |
| **T02** | Sin token Bearer intenta donar o crear | HTTP 401 Unauthorized bloqueado en API Gateway PEP | CA-03.2, RNF-HU-02 | `node tests/run-single-test.js T02` | `informe/screenshots/015-test_t02_unauthorized.png` |
| **T03** | Donante intenta crear o publicar proyecto | HTTP 403 Forbidden (requiere rol GESTOR y scope) | CA-04.1, HU-04 | `node tests/run-single-test.js T03` | `informe/screenshots/016-test_t03_forbidden_role.png` |
| **T04** | Donante envía 0, 100001, negativo o float | HTTP 400 Bad Request (validación Zod estricta) | CA-05.2, HU-05 | `node tests/run-single-test.js T04` | `informe/screenshots/017-test_t04_invalid_payload.png` |
| **T05** | Donante crea intención válida con idempotencia | HTTP 201 Created, estado PENDIENTE_SIMULACION | CA-05.1, CA-05.3, HU-05 | `node tests/run-single-test.js T05` | `informe/screenshots/018-test_t05_intencion_valida.png` |
| **T06** | Repite clave y payload idénticos | HTTP 201 en caché, misma donación sin duplicar | CA-05.4, RNF-HU-04 | `node tests/run-single-test.js T06` | `informe/screenshots/018-test_t06_t07_idempotencia.png` |
| **T07** | Repite clave con payload distinto | HTTP 409 Conflict detectado por colisión SHA-256 | CA-05.4, RNF-HU-04 | `node tests/run-single-test.js T07` | `informe/screenshots/018-test_t06_t07_idempotencia.png` |
| **T08** | 10 confirmaciones concurrentes de misma donación | Exactamente 1 HTTP 200 y 9 HTTP 409 (delta exacto) | CA-06.2, CA-NF04.1 | `node tests/run-single-test.js T08` | `informe/screenshots/019-test_t08_concurrencia_10_requests.png` |
| **T09** | Donante B intenta consultar/confirmar donación de A | HTTP 403 Forbidden / 404 (Ataque BOLA mitigado) | CA-07.1, CA-07.2, HU-07 | `node tests/run-single-test.js T09` | `informe/screenshots/020-test_t09_bola_mitigado.png` |
| **T10** | Lambda de lectura intenta escribir en DynamoDB | AccessDenied / implicitDeny en Policy Simulator | CA-NF03.1, RNF-HU-03 | `node tests/run-single-test.js T10` | `informe/screenshots/021-test_t10_iam_least_privilege.png` |
| **T11** | ID Token o token con firma alterada/alg:none | HTTP 401 en PEP o HTTP 403 por falta de scopes | CA-03.2, CA-NF02.1 | `node tests/run-single-test.js T11` | `informe/screenshots/022-test_t11_id_token_rejected.png` |
| **T12** | Gestor consulta historial de donante o auditoría | HTTP 403 Forbidden mutuo (Segregación SoD) | CA-04.2, CA-10.1, HU-10 | `node tests/run-single-test.js T12` | `informe/screenshots/023-test_t12_segregacion_roles.png` |
| **T13** | Token revocado o expirado usado como Bearer | HTTP 401 / invalid_grant tras revocación | CA-03.3, CA-03.4 | `node tests/run-single-test.js T13` | `informe/screenshots/024-test_t13_expiracion_revocacion.png` |
| **T14** | Usuario GESTOR inicia sesión sin TOTP MFA | Bloqueado con desafío SOFTWARE_TOKEN_MFA sin tokens | CA-11.1, CA-11.2, HU-11 | `node tests/run-single-test.js T14` | `informe/screenshots/025-test_t14_mfa_obligatorio.png` |

---

## 💡 Cómo Tomar las Capturas con Presentación Limpia

1. **Abre tu terminal** con buen tamaño de letra y fondo oscuro o claro (contraste alto).
2. **Ejecuta el comando** correspondiente al test que deseas capturar (ejemplo: `node tests/run-single-test.js T02`).
3. La herramienta imprime:
   - Encabezado con Escenario, Trazabilidad, Resultado Esperado y Endpoint AWS.
   - Tabla con cada sub-escenario en verde `✔ PASS (CUMPLE)`.
   - Veredicto final: `APROBADO (100% CONFORME NIST & REQUIREMENTS.MD)`.
4. **Toma la captura** de la ventana de terminal y guárdala con el nombre indicado en `informe/screenshots/`.
5. Una vez reemplazadas las imágenes que desees, compila el informe con:
   ```bash
   typst compile informe/INFORME_LAB04_ZERO_TRUST.typ informe/INFORME_LAB04_ZERO_TRUST.pdf
   ```
