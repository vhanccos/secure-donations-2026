# Declaración de Asistencia de Inteligencia Artificial (AI_USAGE.md)

**Proyecto:** Plataforma de Donaciones Seguras — «Fundación AQP-SOLIDARIA» (Laboratorio 04)  
**Curso:** Tópicos Avanzados en Ingeniería de Software — EPIS, UNSA  
**Fecha:** 2026-11-12  
**Estándar de Seguridad:** NIST SP 800-207 (Zero Trust Architecture)  
**Integrantes:**
- Vladimir Hancco (`vhanccos`) — Arquitectura Cloud & DevOps
- Jean Chara (`jcharaco@unsa.edu.pe`) — Backend & Lógica de Negocio
- Jeanpier Valera (`jvalera@unsa.edu.pe`) — Frontend SPA & Seguridad Cliente
- Gonzalo Layme (`glaymem@unsa.edu.pe`) — QA, Pruebas Negativas & Auditoría

---

## 1. Declaración Formal y Cumplimiento de Políticas Éticas
En estricto cumplimiento con la directiva de la rúbrica y las políticas académicas de la Universidad Nacional de San Agustín (UNSA), se declara que el equipo empleó asistentes de inteligencia artificial como herramientas de soporte para acelerar tareas de *scaffolding*, revisión de código, redacción de pruebas automatizadas y elaboración de diagramas.

**Reglas éticas aplicadas rigurosamente:**
1. **Validación Humana Obligatoria:** Todo código o artefacto generado por IA fue revisado, modificado y validado por los integrantes del equipo antes de ser integrado.
2. **Revisión por Pares (Peer Review):** Los cambios se integraron mediante ramas de características cortas e inspección obligatoria en Pull Requests (PRs).
3. **Cero Secretos y Datos Reales:** Nunca se compartieron llaves de acceso AWS, secretos, credenciales ni datos personales reales con los modelos.
4. **Gobierno de Seguridad:** Los modelos de autorización (PDP, validación Zod, transacciones atómicas `TransactWriteItems` y roles IAM) fueron auditados y verificados empíricamente con suites de pruebas reales contra AWS.

---

## 2. Matriz de Asistencia de IA por Módulo

| Herramienta / Modelo | Participantes | Módulos / Tareas Asistidas | Aportes Generados por IA | Validación Humana y Correcciones Aplicadas | Limitaciones y Riesgos Detectados |
|---|---|---|---|---|---|
| **Antigravity CLI (Gemini 3.8)** | Vladimir Hancco | Infraestructura como Código (`template.yaml` SAM, Cognito, API Gateway) | Scaffolding inicial de recursos SAM, definición de scopes OAuth y grupos de Cognito. | Se corrigió la asignación de políticas SCP en AWS IAM, se restringió el endpoint de simulación al stage académico `academic` y se fijó el presupuesto de AWS Budgets a \$1.00 USD. | Las plantillas iniciales incluían comodines en IAM (`Action: *`), los cuales fueron eliminados por el equipo para cumplir con mínimo privilegio. |
| **Antigravity CLI (Gemini 3.8)** | Jean Chara | Backend Serverless (Node.js 24 + TypeScript, DynamoDB) | Esqueletos de funciones Lambda, esquemas de validación Zod e interfaces de eventos. | El equipo diseñó la transacción atómica `TransactWriteItems` con hash SHA-256 para idempotencia y corrigió el manejo de mayúsculas/minúsculas en encabezados HTTP. | Respuestas genéricas de error sin tipado Zod estricto; el equipo calibró códigos HTTP 400/404/409 según `requirements.md`. |
| **Antigravity CLI (Gemini 3.8)** | Jeanpier Valera | Frontend SPA (React 19 + Tailwind CSS + Vite) | Componentes de UI, modal de autenticación MFA TOTP y visualizador de auditoría. | Implementación del centinela *Storage Purge Guard* para erradicar tokens de `localStorage`/`sessionStorage` y mecanismo de refresco automático de tokens. | El demo switcher inicial simulaba JWTs locales no aceptados por API Gateway; se conectó con tokens reales firmados por Cognito con scopes legítimos. |
| **Antigravity CLI (Gemini 3.8)** | Gonzalo Layme | QA y Pruebas Automatizadas (T01 a T14, adversarial probes) | Generación de plantillas de prueba en Node.js Test Runner y Vitest. | Ajuste de las aserciones de concurrencia (10 peticiones simultáneas) y pruebas negativas de BOLA/IDOR extrayendo el claim criptográfico `sub`. | Latencias de red en ráfagas simultáneas generaban timeouts; se configuró reintentos controlados con backoff. |

---

## 3. Justificación y Trazabilidad en Repositorio
Los aportes descritos pueden auditarse directamente en el historial de commits y Pull Requests del repositorio oficial en GitHub:
- **Repositorio:** [https://github.com/vhanccos/secure-donations-2026](https://github.com/vhanccos/secure-donations-2026)
- **PR #1:** Infraestructura base SAM, Cognito User Pool y API Gateway HTTP v2.
- **PR #2:** Implementación de Frontend React 19 con almacenamiento volátil de tokens.
- **PR #3:** Handlers backend con idempotencia atómica y validación Zod.
- **PR #4:** Batería de pruebas automatizadas T01–T14 y verificación de seguridad NIST.
