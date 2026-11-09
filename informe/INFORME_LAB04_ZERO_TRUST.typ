#import "@preview/codly:1.3.0": *
#import "@preview/codly-languages:0.1.6": *

// =========================================================================
// PALETA CROMÁTICA INSTITUCIONAL & SISTEMA DE DISEÑO UNSA
// =========================================================================
#let c-primary = rgb("#1E3A8A")    // Azul Marino Institucional UNSA
#let c-accent = rgb("#DC2626")     // Rojo Alerta / Negativa
#let c-teal = rgb("#0D9488")       // Teal Solución / Verificación
#let c-amber = rgb("#D97706")      // Ámbar Advertencia
#let c-border = rgb("#CBD5E1")     // Bordes neutrales
#let c-surface = rgb("#F8FAFC")    // Fondo gris claro
#let c-text = rgb("#0F172A")       // Texto oscuro principal
#let c-muted = rgb("#64748B")      // Texto atenuado

#set document(
  title: "Laboratorio 04: Arquitectura Serverless Cloud-Native con Modelo Zero Trust (NIST SP 800-207) — Plataforma de Donaciones Seguras",
  author: (
    "Vladimir Hancco",
    "Jean Chara",
    "Jeanpier Valera",
    "Gonzalo Layme"
  ),
  date: auto
)

#set page(
  paper: "a4",
  margin: (top: 2.0cm, bottom: 2.0cm, left: 2.0cm, right: 2.0cm),
  header: context {
    if counter(page).get().first() > 1 [
      #grid(
        columns: (1fr, auto),
        align(left + bottom)[
          #text(size: 8pt, fill: c-muted, font: "Liberation Sans", weight: "bold")[
            TAIS • LAB 04
          ]
        ],
        align(right + bottom)[
          #text(size: 8pt, fill: c-primary, font: "Liberation Sans", weight: "bold")[
            ZERO TRUST • SERVERLESS AWS
          ]
        ]
      )
      #v(2.5pt)
      #line(length: 100%, stroke: 0.5pt + c-border)
    ]
  },
  footer: context {
    let p = counter(page).get().first()
    if p > 1 [
      #line(length: 100%, stroke: 0.5pt + c-border)
      #v(2.5pt)
      #grid(
        columns: (1fr, auto),
        align(left + top)[
          #text(size: 8pt, fill: c-muted, font: "Liberation Sans", weight: "bold")[
            GRUPO B1
          ]
        ],
        align(right + top)[
          #text(size: 8.5pt, fill: c-primary, font: "Liberation Sans", weight: "bold")[
            Página #(p - 1)
          ]
        ]
      )
    ]
  }
)

#set text(
  font: "Liberation Sans",
  size: 9.3pt,
  fill: c-text,
  lang: "es"
)

#set par(justify: true, leading: 0.66em)

// =========================================================================
// INTEGRACIÓN CODLY (Bloques de Código IDE-Style)
// =========================================================================
#show: codly-init.with()
#codly(
  languages: codly-languages,
  display-icon: true,
  display-name: true,
  zebra-fill: rgb("#F8FAFC"),
  stroke: 0.5pt + c-border,
  radius: 4pt,
  inset: (x: 8pt, y: 3.5pt),
)
#show raw.where(block: true): set text(size: 8pt)
#show raw.where(block: true): set par(leading: 0.40em)

#show heading: it => block(breakable: false)[
  #if it.level == 1 [
    #v(0.4em, weak: true)
    #block(width: 100%)[
      #text(weight: "bold", size: 12.5pt, fill: c-primary)[#it.body]
      #v(2pt)
      #line(length: 100%, stroke: 1.1pt + c-primary)
    ]
    #v(0.25em, weak: true)
  ] else if it.level == 2 [
    #v(0.35em, weak: true)
    #text(weight: "bold", size: 10.2pt, fill: c-primary.lighten(20%))[#it.body]
    #v(0.2em, weak: true)
  ] else [
    #v(0.25em, weak: true)
    #text(weight: "bold", size: 9.2pt, fill: rgb("#334155"))[#it.body]
    #v(0.15em, weak: true)
  ]
]

// Inserción de la Carátula como primera página
#place(top + left, dx: -2.2cm, dy: -2.3cm)[
  #image("screenshots/caratula.pdf", width: 21cm, height: 29.7cm)
]
#pagebreak()

// =========================================================================
// 1. CONTEXTO Y ALCANCE DEL PROYECTO
// =========================================================================
= Contexto del proyecto aplicado y alcance

El presente laboratorio aborda el diseño e implementación de una plataforma cloud-native serverless de captación y gestión de intenciones de donaciones sociales para la entidad ficticia *«Fundación AQP-SOLIDARIA»*. En organizaciones de beneficencia social, la confianza pública y la transparencia en el manejo de fondos son activos críticos. Cualquier incidente de alteración de montos, doble conteo o exposición no autorizada de historiales de donantes compromete de forma irreversible la viabilidad de sus campañas benéficas.

Bajo este escenario, el proyecto implementa un modelo estricto de *Arquitectura de Confianza Cero (Zero Trust Architecture - ZTA)* conforme a los lineamientos del *NIST SP 800-207* [1] y *NIST SP 800-207A* [2], adoptando la premisa fundamental de *«asumir la brecha»* y eliminar cualquier confianza implícita por origen de red.

== Delimitación del Alcance Académico
En estricto apego a las directivas del curso, el sistema gestiona *donaciones simuladas* con fines de verificación de seguridad e integridad transaccional:
- *Prohibición de Datos Financieros Reales:* Queda terminantemente fuera de alcance solicitar o almacenar números de tarjeta bancaria, CVV, fechas de expiración o credenciales de pago.
- *Transiciones de Estado Simuladas:* Las donaciones se crean en estado `PENDIENTE_SIMULACION` y transicionan a `CONFIRMADA_SIMULADA` o `RECHAZADA_SIMULADA` exclusivamente a través de un endpoint condicionado al entorno académico (`stage academic`).
- *Repositorio Oficial:* El ciclo de vida de desarrollo, infraestructura reproducible en AWS SAM y la suite de pruebas negativas automatizadas se encuentran versionados en:

#align(center)[
  #link("https://github.com/vhanccos/secure-donations-2026")[https://github.com/vhanccos/secure-donations-2026]
]

// =========================================================================
// 2. FUNDAMENTACIÓN TEÓRICA ZERO TRUST
// =========================================================================
= Fundamentación Teórica y Modelo Zero Trust

== Principios Fundamentales (NIST SP 800-207)
A diferencia de los modelos perimetrales tradicionales ("castillo y foso"), la arquitectura implementada aplica los 7 principios básicos de NIST SP 800-207 [1]:

#table(
  columns: (1.2fr, 2fr, 1.8fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 6pt, y: 5pt),
  [*Principio NIST SP 800-207*], [*Implementación Técnica en el Sistema*], [*Evidencia / Verificación*],
  [1. Todo dato y servicio es un recurso], [Cada endpoint HTTP y tabla DynamoDB cuenta con políticas de acceso explícitas y roles independientes.], [Políticas IAM y tabla de endpoints SAM],
  [2. Comunicación segura independiente de la red], [Cifrado TLS 1.3 obligatorio de extremo a extremo mediante CloudFront y API Gateway.], [CA-NF01.1 (HTTPS forzado, HSTS)],
  [3. Acceso por sesión y por recurso individual], [Access tokens con vigencia $<= 15$ min, scopes OAuth 2.0 por ruta y validación de propiedad por recurso (`sub`).], [T09 (BOLA), T11 (Scopes), T13],
  [4. Política dinámica y contextual], [Evaluación en tiempo de ejecución combinando identidad autenticada, grupo de Cognito, estado del proyecto y stage de despliegue.], [T03 (403 GESTOR), T08, T12],
  [5. Monitoreo de activos e integridad], [Limitación declarada del Free Tier (sin inspección de postura de dispositivo ZTNA); mitigado con CloudTrail y auditoría CI.], [Sección de limitaciones declaradas],
  [6. Autenticación y autorización estrictas], [JWT Authorizer en PEP + validación RBAC/Ownership en Lambda PDP + MFA TOTP obligatorio para `GESTOR` y `AUDITOR`.], [T02 (401), T11, T14 (MFA forzado)],
  [7. Recolección de telemetría continua], [Logs estructurados JSON en CloudWatch sin secretos, tabla de `AuditEvents` y CloudTrail habilitado.], [CA-NF07.1, CA-NF07.2]
)

== Arquitectura Lógica de Control y Datos
Siguiendo el modelo conceptual de NIST SP 800-207 y CISA ZTMM v2.0 [4], se desacopla el plano de control del plano de datos:
1. *Policy Administrator (PA):* Amazon Cognito User Pool gestiona identidades, emite tokens de vida corta (15 min) mediante Authorization Code con PKCE y fuerza MFA TOTP en cuentas privilegiadas.
2. *Policy Enforcement Point (PEP):* Amazon API Gateway (HTTP API) valida la firma criptográfica del JWT, emisor, caducidad y scopes declarados. CloudFront actúa como PEP en la capa web entregando cabeceras de seguridad estrictas (CSP, HSTS).
3. *Policy Decision Point (PDP):* Funciones AWS Lambda (Node.js 24) en el módulo `authz` evalúan claims verificados (`sub`, `cognito:groups`) contra el estado actual del recurso en Amazon DynamoDB para impedir escalaciones verticales y horizontales (BOLA / OWASP API1:2023 [5]).

// =========================================================================
// 3. GOBERNANZA Y SETUP AWS FREE TIER
// =========================================================================
= Gobernanza y Configuración de Cuenta AWS Free Tier

En cumplimiento con el requisito *RNF-HU-09 (CA-NF09.1)*, la infraestructura opera bajo el plan gratuito de AWS (Free Tier), asegurando costo cero y estricto control de privilegios:

== Aseguramiento de Cuenta y Control de Presupuesto
1. *Usuario Root Asegurado:* Se activó MFA TOTP físico/app en la cuenta administradora y se revocaron todas las llaves de acceso de larga duración.
2. *Alerta Preventiva en AWS Budgets:* Se configuró un presupuesto con límite de *\$1.00 USD* mensual en la región `us-east-2`, con notificaciones automatizadas vía correo electrónico al 50%, 80% y 100% de consumo estimado.

#align(center)[
  #text(size: 8pt, fill: c-muted, style: "italic")[*Figura 1.* Alarma de costo cero configurada en AWS Budgets con umbral de \$1.00 USD.]
]

== Aprovisionamiento de Usuarios IAM por Integrante (CA-NF03.3)
Para garantizar el principio de mínimo privilegio en el equipo de ingeniería, se crearon cuatro usuarios individuales en AWS IAM, erradicando el uso compartido de credenciales:

#align(center)[
  #image("screenshots/002-setup_iam_users.png", width: 85%)
  #v(2pt)
  #text(size: 8pt, fill: c-muted, style: "italic")[*Figura 2.* Usuarios IAM individuales creados en la consola de AWS para los cuatro integrantes del equipo.]
]

#table(
  columns: (1.1fr, 0.9fr, 1.3fr, 2.1fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 5pt, y: 5pt),
  [*Integrante*], [*Usuario IAM*], [*Correo / Identificador*], [*Rol de Ingeniería Asignado*],
  [Vladimir Hancco], [`vlad`], [`vhanccos@gmail.com`], [Líder Técnico, Cloud Infrastructure & DevOps (SAM, CI/CD, IAM)],
  [Jean Chara], [`jean`], [`jcharaco@unsa.edu.pe`], [Ingeniero Backend Core (Idempotencia atómica, DynamoDB, Transacciones)],
  [Jeanpier Valera], [`jeanpier`], [`jvalera@unsa.edu.pe`], [Arquitecto de Seguridad e Identidad (Cognito, MFA, Threat Model)],
  [Gonzalo Layme], [`gonzalo`], [`glaymem@unsa.edu.pe`], [Frontend Lead & Accesibilidad (React 19, OIDC tokens en memoria)]
)

// =========================================================================
// 4. DESARROLLO COLABORATIVO Y CI/CD
// =========================================================================
= Desarrollo Colaborativo, Git y CI/CD

El proyecto se estructuró como monorepo modular bajo ramas de características por integrante, asegurando autoría explícita en el registro de commits (`git log`):

#codly(header: [Comando — Verificación de Autoría y Ramas en Git])
```bash
git log --graph --pretty=format:'%h - %an (%ar): %s' -n 10
```

#align(center)[
  #image("screenshots/008-git_branches_prs.png", width: 88%)
  #v(2pt)
  #text(size: 8pt, fill: c-muted, style: "italic")[*Figura 3.* Historial de Git evidenciando ramas por integrante y flujo de Pull Requests.]
]

El pipeline automatizado en GitHub Actions (`.github/workflows/ci.yml`) verifica en cada Pull Request:
1. Análisis estático y estilo con *ESLint 10*.
2. Comprobación estricta de tipos con *TypeScript Compiler (`tsc --noEmit`)*.
3. Batería de pruebas unitarias en *Vitest 5* para validación de esquemas Zod y cálculo de hashes criptográficos.
4. Auditoría de seguridad de dependencias (`npm audit`).

#align(center)[
  #image("screenshots/009-ci_github_actions.png", width: 85%)
  #v(2pt)
  #text(size: 8pt, fill: c-muted, style: "italic")[*Figura 4.* Pipeline de CI en GitHub Actions ejecutando pruebas y validaciones en verde.]
]

// =========================================================================
// 5. IMPLEMENTACIÓN TÉCNICA CLAVE
// =========================================================================
= Implementación Técnica de Controles Críticos

== Autenticación OIDC con PKCE y Tokens en Memoria (RNF-HU-11)
La SPA React implementa el flujo *OAuth 2.0 Authorization Code con PKCE (Proof Key for Code Exchange)* conectada a Amazon Cognito. Para mitigar ataques de Cross-Site Scripting (XSS) y robo de credenciales:
- Los tokens de acceso y refresco se almacenan *exclusivamente en memoria volátil de la aplicación* (React Context), descartando por diseño el uso de `localStorage` o `sessionStorage`.
- La caducidad del token de acceso se configuró en *15 minutos*.

== Idempotencia Atómica con TransactWriteItems (RNF-HU-04)
Para prevenir doble aporte o inconsistencias ante reintentos de red, el registro de la intención de donación ejecuta una transacción atómica condicionada en DynamoDB:

#codly(header: [TypeScript — Reserva de Idempotencia y Donación Atómica en DynamoDB])
```typescript
await ddb.send(new TransactWriteCommand({
  TransactItems: [
    {
      Put: {
        TableName: process.env.IDEMPOTENCY_TABLE_NAME,
        Item: { pk: `${donorSub}#createDonation#${idempotencyKey}`, payloadHash, donationId, expiresAt: ttl24h },
        ConditionExpression: "attribute_not_exists(pk)"
      }
    },
    {
      Put: {
        TableName: process.env.DONATIONS_TABLE_NAME,
        Item: { donationId, projectId, donorSub, amountCents, currency: "PEN", status: "PENDIENTE_SIMULACION", createdAt: now }
      }
    }
  ]
}));
```

Si la clave ya existe con el mismo hash SHA-256 del payload, se retorna la respuesta previa (idempotencia exitosa). Si el payload difiere, se rechaza inmediatamente con `HTTP 409 Conflict`.

// =========================================================================
// 6. MATRIZ DE VERIFICACIÓN Y PRUEBAS DE SEGURIDAD (T01 - T14)
// =========================================================================
= Verificación de Seguridad y Pruebas Negativas

A continuación se resume la ejecución de los 14 casos de prueba de aceptación y seguridad exigidos en el laboratorio:

#table(
  columns: (0.7fr, 1.8fr, 1.2fr, 1.5fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 5pt, y: 4.5pt),
  [*ID*], [*Escenario de Prueba*], [*Resultado Esperado*], [*Evidencia / Figura*],
  [T01], [Visitante consulta catálogo], [HTTP 200 (sin borradores)], [Figura 10 (Catálogo)],
  [T02], [Intento de donar sin token], [HTTP 401 Unauthorized], [Figura 15 (Prueba T02)],
  [T03], [Donante intenta crear proyecto], [HTTP 403 Forbidden], [Figura 16 (Prueba T03)],
  [T04], [Monto cero o inválido], [HTTP 400 Bad Request], [Figura 17 (Prueba T04)],
  [T05], [Intención de donación válida], [HTTP 201 Created], [Figura 11 (Donación)],
  [T06], [Reintento con misma clave y body], [HTTP 201 (idéntico id)], [Figura 18 (Idempotencia)],
  [T07], [Misma clave con body modificado], [HTTP 409 Conflict], [Figura 18 (Conflicto Hash)],
  [T08], [10 confirmaciones concurrentes], [1 HTTP 200 y 9 HTTP 409], [Figura 19 (Concurrencia)],
  [T09], [Donante A consulta donación ajena], [HTTP 403/404 (BOLA)], [Figura 20 (BOLA mitigado)],
  [T10], [Lambda de lectura intenta escribir], [AccessDeniedException], [Figura 21 (Mínimo Privilegio)],
  [T11], [Uso de ID Token en endpoint], [HTTP 401 Unauthorized], [Figura 22 (Scopes OAuth)],
  [T12], [Gestor consulta historial privado], [HTTP 403 Forbidden], [Figura 20 (Segregación)],
  [T13], [Token revocado antes de expirar], [Válido hasta 15 min], [Limitación Documentada],
  [T14], [Gestor inicia sesión sin MFA], [Desafío MFA no completado], [Figura 12 (TOTP Obligatorio)]
)

#align(center)[
  #image("screenshots/019-test_t08_concurrencia_10_requests.png", width: 85%)
  #v(2pt)
  #text(size: 8pt, fill: c-muted, style: "italic")[*Figura 5.* Demostración de atomicidad en concurrencia (T08): 10 peticiones simultáneas resultan en un único incremento exitoso.]
]

// =========================================================================
// 7. OBSERVABILIDAD Y REGISTRO DE IA
// =========================================================================
= Observabilidad, Declaración de IA y Conclusiones

== Observabilidad sin Fuga de Secretos (RNF-HU-07)
En estricto apego al principio de confidencialidad, los logs en CloudWatch estructurados en JSON incorporan `requestId`, acción, código HTTP y latencia, sanitizando rigurosamente tokens JWT, claves y parámetros sensibles:

#align(center)[
  #image("screenshots/023-cloudwatch_json_logs.png", width: 85%)
  #v(2pt)
  #text(size: 8pt, fill: c-muted, style: "italic")[*Figura 6.* Telemetría en CloudWatch Logs demostrando estructura JSON sanitizada.]
]

== Declaración de Asistencia de Inteligencia Artificial (AI_USAGE.md)
Siguiendo las directrices del curso, el uso de asistentes de IA (Antigravity CLI / Gemini 3.8 Flash) fue registrado transparentemente con supervisión humana y validación mediante pruebas:

#table(
  columns: (1fr, 1.3fr, 2fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 6pt, y: 5pt),
  [*Fase / Tarea*], [*Herramienta / Modelo*], [*Aporte y Corrección Humana Realizada*],
  [Infraestructura SAM], [Antigravity / Gemini 3.8], [Scaffolding de `template.yaml`. El equipo corrigió la condición de despliegue del endpoint de simulación para aislarlo al stage `academic`.],
  [Idempotencia DynamoDB], [Antigravity / Gemini 3.8], [Generación de lógica `TransactWriteCommand`. El equipo auditó e incorporó la expresión `attribute_not_exists(pk)` para evitar condiciones de carrera.],
  [Pruebas Negativas], [Antigravity / Gemini 3.8], [Automatización del script cURL para T01-T14. El equipo verificó manualmente las respuestas 401, 403 y 409.]
)

== Plan de Limpieza y Desmantelamiento (RNF-HU-09)
Para garantizar la eliminación total de recursos al término de la evaluación y prevenir cualquier costo residual:
1. Vaciado y eliminación de buckets S3 creados para el frontend y artefactos de despliegue (`aws s3 rm s3://<bucket> --recursive`).
2. Desmantelamiento completo de la infraestructura serverless mediante `sam delete --no-prompts`.
3. Verificación de balance \$0.00 en AWS Budgets y eliminación de los usuarios IAM creados.

// =========================================================================
// 8. REFERENCIAS BIBLIOGRÁFICAS
// =========================================================================
= Referencias Bibliográficas

- [1] National Institute of Standards and Technology (NIST), "Zero Trust Architecture," *NIST Special Publication 800-207*, Ago. 2020. doi: 10.6028/NIST.SP.800-207.
- [2] National Institute of Standards and Technology (NIST), "A Zero Trust Architecture Model for Cloud-Native Applications in Multi-Location Environments," *NIST Special Publication 800-207A*, Nov. 2023. doi: 10.6028/NIST.SP.800-207A.
- [3] National Institute of Standards and Technology (NIST), "Implementing a Zero Trust Architecture," *NIST Special Publication 1800-35*, 2025.
- [4] Cybersecurity and Infrastructure Security Agency (CISA), "Zero Trust Maturity Model Version 2.0," CISA Cybersecurity Division, Abr. 2023.
- [5] OWASP Foundation, "OWASP API Security Top 10 2023," Open Web Application Security Project, Jun. 2023. [Online]. Disponible: https://owasp.org/API-Security/
