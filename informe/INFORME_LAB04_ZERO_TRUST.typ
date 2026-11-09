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
    "Vladimir Hancco (vhanccos)",
    "Jean Chara (jcharaco@unsa.edu.pe)",
    "Jeanpier Valera (jvalera@unsa.edu.pe)",
    "Gonzalo Layme (glaymem@unsa.edu.pe)"
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
            TAIS • LAB 04 — ARQUITECTURA ZERO TRUST
          ]
        ],
        align(right + bottom)[
          #text(size: 8pt, fill: c-primary, font: "Liberation Sans", weight: "bold")[
            FUNDACIÓN AQP-SOLIDARIA • AWS SERVERLESS
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
            UNSA • EPIS • GRUPO B1
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
  size: 9.0pt,
  fill: c-text,
  lang: "es"
)

#set par(justify: true, leading: 0.62em)

// =========================================================================
// INTEGRACIÓN CODLY & FIGURAS
// =========================================================================
#show: codly-init.with()
#codly(
  languages: codly-languages,
  display-icon: true,
  display-name: true,
  zebra-fill: rgb("#F8FAFC"),
  stroke: 0.5pt + c-border,
  radius: 4pt,
  inset: (x: 7pt, y: 3.5pt),
)
#show raw.where(block: true): set text(size: 7.8pt)
#show raw.where(block: true): set par(leading: 0.38em)

#show figure.caption: set text(size: 7.8pt, fill: c-muted)
#show figure.where(kind: image): set figure(supplement: [Figura])

#show heading: it => block(breakable: false)[
  #if it.level == 1 [
    #v(0.5em, weak: true)
    #block(width: 100%)[
      #text(weight: "bold", size: 12.0pt, fill: c-primary)[#it.body]
      #v(2pt)
      #line(length: 100%, stroke: 1.1pt + c-primary)
    ]
    #v(0.3em, weak: true)
  ] else if it.level == 2 [
    #v(0.4em, weak: true)
    #text(weight: "bold", size: 10.0pt, fill: c-primary.lighten(20%))[#it.body]
    #v(0.2em, weak: true)
  ] else [
    #v(0.3em, weak: true)
    #text(weight: "bold", size: 9.0pt, fill: rgb("#334155"))[#it.body]
    #v(0.15em, weak: true)
  ]
]

// Inserción de la Carátula como primera página
#place(top + left, dx: -2.2cm, dy: -2.3cm)[
  #image("screenshots/caratula.pdf", width: 21cm, height: 29.7cm)
]
#pagebreak()

// =========================================================================
// MEMBRETE INSTITUCIONAL FORMAL
// =========================================================================
#align(center)[
  #text(size: 13.5pt, weight: "bold", fill: c-primary)[UNIVERSIDAD NACIONAL DE SAN AGUSTÍN DE AREQUIPA]\
  #v(2pt)
  #text(size: 10.5pt, weight: "bold")[FACULTAD DE INGENIERÍA DE PRODUCCIÓN Y SERVICIOS — EPIS]\
  #v(2pt)
  #text(size: 9.5pt, fill: c-muted)[Tópicos Avanzados en Ingeniería de Software (Grupo B1) • Docente: Mg. Robert Edison Arisaca Mamani]\
  #v(5pt)
  #text(size: 11.5pt, weight: "bold", fill: c-text)[INFORME TÉCNICO DE LABORATORIO 04]\
  #text(size: 10.5pt, weight: "bold", fill: c-primary)[Arquitectura Serverless Cloud-Native con Modelo Zero Trust (NIST SP 800-207)]\
  #text(size: 9.2pt, style: "italic", fill: rgb("#334155"))[Plataforma de Donaciones Seguras — «Fundación AQP-SOLIDARIA»]\
  #v(4pt)
  #text(size: 8.5pt)[
    *Autores del Equipo:*
    Vladimir Hancco (`vhanccos`) •
    Jean Chara (`jcharaco@unsa.edu.pe`) •
    Jeanpier Valera (`jvalera@unsa.edu.pe`) •
    Gonzalo Layme (`glaymem@unsa.edu.pe`)
  ]
]
#v(6pt)
#line(length: 100%, stroke: 0.8pt + c-border)
#v(6pt)

// =========================================================================
// 1. CONTEXTO Y ALCANCE DEL PROYECTO
// =========================================================================
= Contexto del proyecto aplicado y alcance

El presente laboratorio aborda el diseño, despliegue y verificación empírica de una plataforma cloud-native serverless de captación y gestión de intenciones de donaciones sociales para la entidad benéfica *«Fundación AQP-SOLIDARIA»*. En organizaciones de beneficencia social, la confianza pública y la transparencia en el manejo de fondos son activos críticos. Cualquier incidente de alteración de montos, doble conteo transaccional o exposición no autorizada de historiales de donantes compromete de forma irreversible la viabilidad de sus campañas benéficas.

Bajo este escenario, el proyecto implementa un modelo estricto de *Arquitectura de Confianza Cero (Zero Trust Architecture - ZTA)* conforme a los lineamientos de *NIST SP 800-207* [1] y *NIST SP 800-207A* [2], adoptando la premisa fundamental de *«asumir la brecha»* (assume breach), eliminando toda confianza implícita por origen de red, aplicando autenticación y autorización continua en cada recurso, y forzando el principio de menor privilegio.

== Delimitación del Alcance Académico
En estricto apego a las directivas del curso y a los requerimientos de seguridad, el sistema gestiona *donaciones simuladas* con fines de verificación de seguridad e integridad transaccional:
- *Prohibición de Datos Financieros Reales:* Queda terminantemente fuera de alcance solicitar, procesar o almacenar números de tarjeta bancaria, CVV, fechas de expiración o credenciales de pago.
- *Transiciones de Estado Simuladas:* Las intenciones de donación se crean en estado `PENDIENTE_SIMULACION` y transicionan a `CONFIRMADA_SIMULADA` o `RECHAZADA_SIMULADA` exclusivamente a través de un endpoint condicionado al entorno académico (`stage academic`).
- *Repositorio Oficial:* El ciclo de vida de desarrollo, infraestructura reproducible en AWS SAM y la suite de pruebas automatizadas se encuentran versionados en el repositorio público de GitHub:

#align(center)[
  #link("https://github.com/vhanccos/secure-donations-2026")
]

// =========================================================================
// 2. FUNDAMENTACIÓN TEÓRICA ZERO TRUST
// =========================================================================
= Fundamentación Teórica y Modelo Zero Trust

== Principios Fundamentales (NIST SP 800-207)
A diferencia de los modelos perimetrales tradicionales ("castillo y foso"), la arquitectura implementada aplica de forma verificable los 7 principios de la publicación especial NIST SP 800-207 [1]:

#table(
  columns: (1.2fr, 2fr, 1.8fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 5pt, y: 4.5pt),
  table.header(
    [*Principio NIST SP 800-207*], [*Implementación Técnica en la Plataforma*], [*Evidencia / Verificación*]
  ),
  [1. Todo dato y servicio es un recurso], [Cada endpoint HTTP de API Gateway y cada tabla de DynamoDB cuenta con políticas de acceso explícitas y roles IAM independientes.], [Políticas IAM mínimas por función SAM; pruebas T01, T02, T10],
  [2. Comunicación segura independiente de la red], [Cifrado TLS 1.3 / HTTPS obligatorio de extremo a extremo. Cabeceras HSTS, CSP estricto y denegación de tráfico plano HTTP.], [CA-NF01.1; T01.3 (HSTS, nosniff, DENY)],
  [3. Acceso por sesión y recurso individual], [Access tokens JWT con vigencia $<= 15$ min, scopes OAuth 2.0 por ruta y validación de propiedad por recurso (`sub`).], [T09 (BOLA/IDOR mitigado), T11 (Scopes), T13 (Expiración)],
  [4. Política dinámica y contextual], [Evaluación en tiempo de ejecución combinando identidad autenticada, grupo de Cognito, estado del proyecto y stage de despliegue.], [T03 (403 GESTOR requerido), T08, T12 (Segregación)],
  [5. Monitoreo de activos e integridad], [Limitación declarada del Free Tier (sin inspección ZTNA de endpoint físico); mitigado con CloudTrail y auditoría estricta en CI.], [Sección 3 / 7; logs estructurados y CloudTrail],
  [6. Autenticación y autorización estrictas], [JWT Authorizer en PEP + validación RBAC/Ownership en Lambda PDP + MFA TOTP obligatorio para `GESTOR` y `AUDITOR`.], [T02 (401 PEP), T11 (Firma), T14 (MFA TOTP obligatorio)],
  [7. Recolección de telemetría continua], [Logs estructurados JSON en CloudWatch sin secretos, tabla dedicada `AuditEvents` en DynamoDB y trazabilidad por `requestId`.], [CA-NF07.1, CA-NF07.2; T12.4 (Auditoría)]
)

== Arquitectura Lógica de Control y Datos (PA, PEP, PDP)
Siguiendo los estándares de NIST SP 800-207 y CISA ZTMM v2.0 [4], el sistema desacopla con rigor el plano de control del plano de datos:
1. *Policy Administrator (PA):* Amazon Cognito User Pool (`us-east-2_jSTLexY2N`) administra identidades federadas, autenticación multifactor (TOTP), y emite tokens JWT de vida corta (15 min) mediante flujos seguros PKCE.
2. *Policy Enforcement Point (PEP):* Amazon API Gateway HTTP API v2 intercepta toda solicitud entrante como punto de control perimetral, validando la firma RSA, el issuer y los scopes OAuth requeridos (`donations:write`, etc.) antes de invocar cualquier cómputo.
3. *Policy Decision Point (PDP):* Funciones AWS Lambda (Node.js 24 + TypeScript) ejecutan el módulo de autorización (`authz/pdp.ts`), evaluando los claims criptográficos (`sub`, `cognito:groups`) y las restricciones de negocio para prevenir vulnerabilidades de autorización a nivel de objeto (BOLA / OWASP API1:2023 [5]).

// =========================================================================
// 3. GOBERNANZA, SETUP AWS FREE TIER Y RECURSOS DESPLEGADOS
// =========================================================================
= Gobernanza, Configuración AWS Free Tier y Recursos Desplegados

En cumplimiento estricto con el requerimiento *RNF-HU-09 (CA-NF09.1)*, la infraestructura opera bajo el plan gratuito de AWS (Free Tier), asegurando costo cero y estricto control de privilegios de acceso.

== Aseguramiento de Cuenta y Control Preventivo de Presupuesto
1. *Protección de Cuenta Root:* Se activó autenticación multifactor (MFA TOTP) en la cuenta administradora y se revocaron permanentemente todas las llaves de acceso estáticas (access keys).
2. *Alarma Preventiva en AWS Budgets:* Se configuró un presupuesto mensual con umbral de *\$1.00 USD* en la región `us-east-2`, con notificaciones automatizadas vía correo electrónico al 50%, 80% y 100% del consumo proyectado.

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/001-setup_aws_budgets.png", width: 100%),
    caption: [Alarma de costo cero configurada en AWS Budgets con umbral de \$1.00 USD.]
  ),
  figure(
    image("screenshots/002-setup_iam_users.png", width: 100%),
    caption: [Usuarios IAM individuales aprovisionados para los 4 integrantes del equipo.]
  )
)

== Aprovisionamiento de Usuarios IAM por Integrante (CA-NF03.3)
Para garantizar la trazabilidad individual y erradicar el uso compartido de credenciales, se aprovisionaron cuatro usuarios en AWS IAM con permisos acotados:

#table(
  columns: (1.2fr, 0.8fr, 1.4fr, 2.1fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 5pt, y: 4.5pt),
  table.header(
    [*Integrante*], [*Usuario IAM*], [*Identificador / Correo*], [*Rol de Ingeniería Asignado*]
  ),
  [Vladimir Hancco], [`vlad`], [vhanccos (`vhanccos@gmail.com`)], [Líder Técnico, Cloud Infrastructure & DevOps (SAM, CI/CD, IAM)],
  [Jean Chara], [`jean`], [`jcharaco@unsa.edu.pe`], [Ingeniero Backend Core (Idempotencia atómica, DynamoDB, Transacciones)],
  [Jeanpier Valera], [`jeanpier`], [`jvalera@unsa.edu.pe`], [Arquitecto de Seguridad e Identidad (Cognito, MFA, Threat Model)],
  [Gonzalo Layme], [`gonzalo`], [`glaymem@unsa.edu.pe`], [Frontend Lead & Accesibilidad (React 19, OIDC tokens en memoria)]
)

== Recursos Físicos Desplegados en AWS `us-east-2`
La infraestructura en la nube está completamente desplegada y operativa, interactuando en vivo con la suite de pruebas automatizadas:

#table(
  columns: (1.2fr, 1.4fr, 2.2fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 5pt, y: 4.5pt),
  table.header(
    [*Componente Arquitectural*], [*Servicio AWS*], [*Identificador Físico / Configuración en us-east-2*]
  ),
  [PEP (API Gateway)], [Amazon API Gateway (HTTP v2)], [`https://evft7i355m.execute-api.us-east-2.amazonaws.com/academic`],
  [PA (Identity Provider)], [Amazon Cognito User Pool], [`us-east-2_jSTLexY2N` (Grupos: DONANTE, GESTOR, AUDITOR)],
  [App Client (SPA PKCE)], [Cognito User Pool Client], [`6qc17dq9iqpoqq8e4sk5doqpnn` (AccessTokenValidity: 15 min)],
  [Auth Domain Hosted UI], [Amazon Cognito Domain], [`https://aqp-solidaria-915275802786.auth.us-east-2.amazoncognito.com`],
  [Catálogo de Proyectos], [Amazon DynamoDB], [Tabla `Projects` (PK: `projectId` [S], GSI: `status-index` [S])],
  [Registro de Donaciones], [Amazon DynamoDB], [Tabla `Donations` (PK: `donationId` [S], GSI: `donorSub-index` [S])],
  [Idempotencia Transaccional], [Amazon DynamoDB], [Tabla `Idempotency` (PK: `pk` [S], TTL activo en `expiresAt` [N])],
  [Auditoría Inmutable], [Amazon DynamoDB], [Tabla `AuditEvents` (PK: `eventType` [S], SK: `timestamp#id` [S])],
  [PDP (Cómputo Backend)], [AWS Lambda (Node.js 24)], [Roles IAM de menor privilegio (`ListProjectsFunctionRole`, etc.)]
)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/003-cognito_user_pool.png", width: 100%),
    caption: [Amazon Cognito User Pool us-east-2_jSTLexY2N y grupos de seguridad.]
  ),
  figure(
    image("screenshots/004-cognito_mfa_config.png", width: 100%),
    caption: [Configuración de TOTP MFA obligatorio para roles administrativos.]
  )
)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/005-apigateway_jwt_authorizer.png", width: 100%),
    caption: [API Gateway HTTP API v2 con JWT Authorizer configurado como PEP.]
  ),
  figure(
    image("screenshots/006-dynamodb_tables.png", width: 100%),
    caption: [Tablas DynamoDB en modo On-Demand (Projects, Donations, Idempotency, Audit).]
  )
)

#align(center)[
  #figure(
    image("screenshots/007-dynamodb_idempotency_ttl.png", width: 68%),
    caption: [Configuración de Time to Live (TTL) activo en el atributo expiresAt de la tabla Idempotency.]
  )
]

// =========================================================================
// 4. DESARROLLO COLABORATIVO Y CI/CD
// =========================================================================
= Desarrollo Colaborativo, Git y CI/CD

El proyecto se estructuró bajo un monorepo modular versionado en GitHub (`secure-donations-2026`). Cada integrante desarrolló sus funcionalidades en ramas de características independientes con autoría verificable en el registro de commits:

#codly(header: [Comando — Verificación de Autoría y Ramas en Git])
```bash
git log --graph --pretty=format:'%h - %an (%ar): %s' -n 10
```

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/008-git_branches_prs.png", width: 100%),
    caption: [Historial de ramas colaborativas y Pull Requests por integrante en GitHub.]
  ),
  figure(
    image("screenshots/009-ci_github_actions.png", width: 100%),
    caption: [Pipeline de CI en GitHub Actions con validación SAM, linting y pruebas.]
  )
)

El flujo de integración continua (`.github/workflows/ci.yml`) evalúa automáticamente en cada Pull Request:
1. Validación estructural de la plantilla Serverless con *AWS SAM CLI (`sam validate`)*.
2. Comprobación estricta de tipos estáticos con *TypeScript Compiler (`tsc --noEmit`)*.
3. Análisis estático y reglas de estilo de código con *ESLint 10*.
4. Batería de pruebas unitarias automatizadas con *Vitest v3.2*.
5. Auditoría de seguridad de dependencias npm (`npm audit --audit-level=high`).

// =========================================================================
// 5. IMPLEMENTACIÓN TÉCNICA DE CONTROLES CRÍTICOS
// =========================================================================
= Implementación Técnica de Controles Críticos & Frontend SPA

== Autenticación OIDC con PKCE y Tokens en Memoria (RNF-HU-11)
La aplicación cliente SPA (React 19 + Vite + Tailwind CSS) implementa el flujo estándar *OAuth 2.0 Authorization Code con PKCE*. Para neutralizar por diseño los vectores de ataque de Cross-Site Scripting (XSS) y robo de credenciales:
- Los tokens JWT (Access Token y Refresh Token) se almacenan *exclusivamente en memoria volátil* de la aplicación (React Context).
- Se implementó un componente centinela (*Storage Purge Guard*) que monitorea e higieniza continuamente `localStorage` y `sessionStorage`, purgando cualquier llave residual.
- La validez del token de acceso se configuró estrictamente en *15 minutos*.

== Banner de Advertencia Académica y Prevención BOLA
En toda la interfaz de usuario se mantiene visible un banner institucional inmutable de advertencia: *«Simulación académica: no se ha realizado ningún cobro real»*. Asimismo, en las vistas privadas de historial (`/donations/me`), el frontend únicamente envía el token de portador; la función Lambda PDP en el backend extrae el claim criptográfico `sub` para consultar exclusivamente las donaciones asociadas a dicho identificador, imposibilitando ataques de asignación masiva o BOLA.

== Idempotencia Atómica con TransactWriteItems (RNF-HU-04)
Para prevenir el doble aporte financiero o condiciones de carrera ante desconexiones de red, la creación de donaciones ejecuta una transacción atómica coordinada en DynamoDB:

#codly(header: [TypeScript — Reserva de Idempotencia y Donación Atómica en DynamoDB])
```typescript
await ddb.send(new TransactWriteCommand({
  TransactItems: [
    {
      Put: {
        TableName: process.env.IDEMPOTENCY_TABLE_NAME,
        Item: {
          pk: `${donorSub}#createDonation#${idempotencyKey}`,
          payloadHash,
          donationId,
          expiresAt: ttl24h
        },
        ConditionExpression: "attribute_not_exists(pk)"
      }
    },
    {
      Put: {
        TableName: process.env.DONATIONS_TABLE_NAME,
        Item: {
          donationId,
          projectId,
          donorSub,
          amountCents,
          currency: "PEN",
          status: "PENDIENTE_SIMULACION",
          createdAt: now
        }
      }
    }
  ]
}));
```

Si la clave UUID ya existe con el mismo hash SHA-256 del payload, se retorna la respuesta previa en caché (`HTTP 201`). Si el payload difiere, se rechaza inmediatamente con `HTTP 409 Conflict`.

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/010-ui_catalogo_publico.png", width: 100%),
    caption: [Catálogo público de proyectos sociales (solo proyectos en estado PUBLICADO).]
  ),
  figure(
    image("screenshots/011-ui_donacion_simulada.png", width: 100%),
    caption: [Modal de intención de donación con banner de advertencia académica.]
  )
)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/012-ui_login_mfa_totp.png", width: 100%),
    caption: [Desafío interactivo de TOTP MFA al iniciar sesión como rol privilegiado.]
  ),
  figure(
    image("screenshots/013-ui_historial_propio.png", width: 100%),
    caption: [Historial de donaciones personales filtrado estrictamente por sub (anti-BOLA).]
  )
)

#align(center)[
  #figure(
    image("screenshots/014-ui_responsive_375px.png", width: 68%),
    caption: [Verificación de diseño responsivo y accesible a 375 px (viewport móvil WCAG 2.2).]
  )
]

// =========================================================================
// 6. VERIFICACIÓN DE SEGURIDAD Y PRUEBAS NEGATIVAS (T01 - T14)
// =========================================================================
= Verificación de Seguridad, Pruebas Negativas y Métricas Reales

== Consolidado Global de Métricas de Verificación
La plataforma fue sometida a una rigurosa suite de pruebas automatizadas multicapa que evalúa la totalidad de los criterios de aceptación y vectores adversarios:

#table(
  columns: (1.8fr, 1.1fr, 0.9fr, 0.8fr, 1.2fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 5pt, y: 4.5pt),
  table.header(
    [*Batería de Pruebas / Capa Evaluada*], [*Herramienta / Harness*], [*Casos*], [*Fallos*], [*Efectividad*]
  ),
  [Backend Unit Tests (Zod, PDP, Idempotency)], [Vitest v3.2.7], [83], [0], [*100% PASS*],
  [Frontend Unit Tests (Auth, MFA, Purge Guard)], [Vitest + React Testing Library], [23], [0], [*100% PASS*],
  [E2E Integration Opaque-Box (Tiers 1-4)], [Node.js Test Runner en vivo], [55], [0], [*100% PASS*],
  [Tier 5 Adversarial Concurrency Stress], [Node.js Concurrency Harness], [5], [0], [*100% PASS*],
  [Adversarial Auth & Scope Challenger Probe], [Cognito & API Gateway Probe], [30], [0], [*100% PASS*],
  [*TOTAL CONSOLIDADO VERIFICADO*], [*Suite Completa Automatizada*], [*196*], [*0*], [*100% PASS*]
)

== Matriz de Casos de Prueba de Aceptación (T01 a T14)
A continuación se detalla la verificación empírica de los 14 escenarios de prueba contra la API desplegada en AWS:

#table(
  columns: (0.6fr, 1.7fr, 1.2fr, 1.4fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 5pt, y: 4.5pt),
  table.header(
    [*ID*], [*Escenario de Prueba y Trazabilidad*], [*Resultado Empírico*], [*Evidencia / Figura*]
  ),
  [T01], [Visitante consulta catálogo; excluye borradores (CA-01.1, CA-01.2, HU-01)], [HTTP 200 (Solo PUBLICADO)], [Figura 10 (Catálogo Público)],
  [T02], [Petición sin token Authorization Bearer (CA-03.2, RNF-HU-02)], [HTTP 401 Unauthorized en PEP], [Figura 15 (Prueba T02)],
  [T03], [Donante intenta crear o publicar proyecto (CA-04.1, HU-04)], [HTTP 403 Forbidden (GESTOR req.)], [Figura 16 (Prueba T03)],
  [T04], [Validación estricta: montos 0, float, negativos o sin UUID (CA-05.2)], [HTTP 400 Bad Request (Zod)], [Figura 17 (Prueba T04)],
  [T05], [Donante crea intención de donación válida con UUID (CA-05.1, HU-05)], [HTTP 201 PENDIENTE_SIMULACION], [Figura 11 (Donación Simulada)],
  [T06], [Reintento con misma clave UUID y payload idéntico (CA-05.4)], [HTTP 201 (caché idempotente)], [Figura 18 (Idempotencia Atómica)],
  [T07], [Reintento con misma clave pero payload modificado (CA-05.4)], [HTTP 409 Conflict (hash mismatch)], [Figura 18 (Conflicto de Hash)],
  [T08], [10 peticiones concurrentes confirmando la misma donación (CA-06.2)], [Exactamente 1x 200 y 9x 409], [Figura 19 (Concurrencia Masiva)],
  [T09], [BOLA / IDOR: Donante intenta ver o alterar donación ajena (CA-07.1)], [HTTP 403 Forbidden / Historial aislado], [Figura 20 (Mitigación BOLA)],
  [T10], [Mínimo privilegio IAM: Lambda de lectura intenta escribir (CA-NF03.1)], [implicitDeny / AccessDeniedException], [Figura 21 (Mínimo Privilegio)],
  [T11], [Token alterado / firma corrupta / ID Token sin scopes OAuth (CA-03.2)], [HTTP 401 / 403 insufficient_scope], [Figura 22 (Rechazo de ID Token)],
  [T12], [Segregación de roles: Gestor en `/donations/me` o Donante en `/audit`], [HTTP 403 Forbidden en ambos casos], [Figura 20 (Segregación de Roles)],
  [T13], [Token revocado o con caducidad vencida (CA-03.3, CA-03.4)], [HTTP 401 expirado / 400 revoke], [Sección 5 (Control de Sesión)],
  [T14], [Usuario privilegiado inicia sesión sin segundo factor (CA-11.2)], [Desafío SOFTWARE_TOKEN_MFA], [Figura 12 (TOTP MFA Obligatorio)]
)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/015-test_t02_unauthorized.png", width: 100%),
    caption: [Prueba T02: Rechazo inmediato HTTP 401 Unauthorized sin token Bearer.]
  ),
  figure(
    image("screenshots/016-test_t03_forbidden_role.png", width: 100%),
    caption: [Prueba T03: Rechazo HTTP 403 Forbidden por violación de rol RBAC.]
  )
)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/017-test_t04_invalid_payload.png", width: 100%),
    caption: [Prueba T04: Validación Zod de montos y tipos (400 Bad Request).]
  ),
  figure(
    image("screenshots/018-test_t06_t07_idempotencia.png", width: 100%),
    caption: [Pruebas T06 y T07: Idempotencia atómica y colisión de hash SHA-256 (409).]
  )
)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/019-test_t08_concurrencia_10_requests.png", width: 100%),
    caption: [Prueba T08 / Tier 5: Concurrencia masiva (10 peticiones: 1x 200 y 9x 409).]
  ),
  figure(
    image("screenshots/020-test_t09_bola_mitigado.png", width: 100%),
    caption: [Pruebas T09 y T12: Mitigación efectiva de BOLA / IDOR y segregación.]
  )
)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/021-test_t10_iam_least_privilege.png", width: 100%),
    caption: [Prueba T10: Verificación de mínimo privilegio IAM (denegación de escritura).]
  ),
  figure(
    image("screenshots/022-test_t11_id_token_rejected.png", width: 100%),
    caption: [Prueba T11: Rechazo de ID Token de Cognito por falta de scopes OAuth.]
  )
)

// =========================================================================
// 7. OBSERVABILIDAD, AUDITORÍA Y CUMPLIMIENTO NORMATIVO
// =========================================================================
= Observabilidad, Declaración de IA y Conclusiones

== Observabilidad sin Fuga de Secretos (RNF-HU-07)
En estricto apego al principio de confidencialidad, las funciones Lambda emiten eventos de telemetría estructurados en JSON hacia CloudWatch Logs, incorporando `requestId`, acción, código HTTP y latencia, sanitizando rigurosamente tokens JWT, firmas criptográficas y parámetros sensibles:

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image("screenshots/023-cloudwatch_json_logs.png", width: 100%),
    caption: [Telemetría en CloudWatch Logs estructurada en JSON y sanitizada.]
  ),
  figure(
    image("screenshots/024-cloudtrail_event_history.png", width: 100%),
    caption: [Pista de auditoría inmutable de eventos de infraestructura en AWS CloudTrail.]
  )
)

== Declaración de Asistencia de Inteligencia Artificial (AI_USAGE.md)
Siguiendo las directrices éticas y académicas del curso, el uso de herramientas de asistencia basada en IA fue documentado transparentemente con validación humana y pruebas automatizadas:

#table(
  columns: (1.2fr, 1.3fr, 2.3fr),
  fill: (col, row) => if row == 0 { c-primary.lighten(90%) } else if calc.even(row) { c-surface } else { white },
  stroke: 0.5pt + c-border,
  inset: (x: 5pt, y: 4.5pt),
  table.header(
    [*Fase / Tarea*], [*Herramienta / Modelo*], [*Aporte Asistido y Corrección Humana Realizada*]
  ),
  [Infraestructura SAM], [Antigravity / Gemini 3.8], [Scaffolding inicial de `template.yaml`. El equipo auditó y restringió el endpoint de simulación al stage académico `academic`.],
  [Idempotencia DynamoDB], [Antigravity / Gemini 3.8], [Sugerencia de patrón `TransactWriteCommand`. El equipo incorporó `attribute_not_exists(pk)` y el hash SHA-256.],
  [Pruebas Automatizadas], [Antigravity / Gemini 3.8], [Generación de plantillas para casos de prueba. El equipo calibró las aserciones en vivo contra AWS y Zod.]
)

#pagebreak()
== Conclusiones Técnicas del Proyecto
A través del ciclo integral de ingeniería y verificación empírica implementado para la plataforma «Fundación AQP-SOLIDARIA», se alcanzaron las siguientes conclusiones fundamentales:
1. *Validación Plena del Modelo Zero Trust (NIST SP 800-207):* Se demostró que la separación estricta entre el Policy Administrator (Cognito), Policy Enforcement Point (API Gateway) y Policy Decision Point (Lambda PDP) erradica la dependencia de perímetros de red tradicionales. Ninguna solicitud accede a datos privados sin verificación criptográfica previa de identidad, scopes OAuth y propiedad de recurso (`sub`).
2. *Integridad Transaccional e Idempotencia Determinista:* La implementación de `TransactWriteItems` con expresiones condicionales y hashes SHA-256 en DynamoDB demostró resiliencia total ante concurrencia extrema (T08 y Tier 5), garantizando exactamente un incremento de saldo y cero duplicaciones ante ráfagas simultáneas.
3. *Mitigación de OWASP API Security Top 10 (2023):* Los controles de autorización a nivel de objeto protegieron el 100% de los endpoints contra ataques BOLA / IDOR (T09), mientras que la segregación bidireccional de roles (T12) y el almacenamiento de tokens exclusivamente en memoria volátil neutralizaron vectores de escalación y robo de credenciales en el navegador.
4. *Efectividad de Verificación de Caja Opaca:* El conjunto de 196 comprobaciones automatizadas independientes (83 backend, 23 frontend, 55 E2E, 5 de concurrencia y 30 de penetración) certifica que el sistema satisface el 100% de los criterios de aceptación interactuando en vivo contra la infraestructura real desplegada en AWS `us-east-2`.
5. *Gobernanza y Viabilidad en AWS Free Tier:* Se evidenció que una arquitectura serverless cloud-native robusta y conforme a los más altos estándares de ciberseguridad puede operar con costo financiero cero (\$0.00 USD), aplicando monitoreo proactivo con AWS Budgets y estricto principio de menor privilegio en IAM.

#block(breakable: false)[
== Plan de Limpieza y Desmantelamiento (RNF-HU-09)
Para certificar la eliminación completa de los recursos al término del ciclo de evaluación académica y asegurar costo cero residual:
1. Vaciado y eliminación de buckets S3 creados para el despliegue del frontend y artefactos de despliegue (`aws s3 rb s3://<bucket> --force`).
2. Desmantelamiento total de la infraestructura serverless mediante `sam delete --no-prompts`.
3. Verificación de balance \$0.00 en AWS Budgets y eliminación de los usuarios IAM creados.
]

// =========================================================================
// 8. REFERENCIAS BIBLIOGRÁFICAS
// =========================================================================
= Referencias Bibliográficas

- [1] National Institute of Standards and Technology (NIST), "Zero Trust Architecture," *NIST Special Publication 800-207*, Ago. 2020. doi: 10.6028/NIST.SP.800-207.
- [2] National Institute of Standards and Technology (NIST), "A Zero Trust Architecture Model for Cloud-Native Applications in Multi-Location Environments," *NIST Special Publication 800-207A*, Nov. 2023. doi: 10.6028/NIST.SP.800-207A.
- [3] National Institute of Standards and Technology (NIST), "Implementing a Zero Trust Architecture," *NIST Special Publication 1800-35*, 2025.
- [4] Cybersecurity and Infrastructure Security Agency (CISA), "Zero Trust Maturity Model Version 2.0," CISA Cybersecurity Division, Abr. 2023.
- [5] OWASP Foundation, "OWASP API Security Top 10 2023," Open Web Application Security Project, Jun. 2023. [Online]. Disponible: #link("https://owasp.org/API-Security/")
