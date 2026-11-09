/**
 * Tier 1: Public Surface & Project Discovery Test Suite
 * Covers Acceptance Test Scenario:
 * - T01: Visitante consulta proyectos públicos (200, excluye borradores)
 * Trazabilidad: CA-01.1, CA-01.2, CA-02.1, CA-02.2, CA-09.1, CA-09.2, CA-NF01.1, CA-NF11.2
 */

import { randomUUID } from 'node:crypto';
import { apiRequest, getCognitoTokens } from '../src/auth-helper.js';
import { CONFIG } from '../src/config.js';
import { TestReporter } from '../src/reporter.js';

export async function runTier1Tests(reporter = new TestReporter('Tier 1: Public Discovery')) {
  reporter.section('TIER 1 — Public Surface & Catalog Discovery (T01, HU-01, HU-02, HU-09)');

  // T01.1 - Public catalog returns HTTP 200 and list of projects
  const catalogRes = await apiRequest('GET', '/v1/projects');
  reporter.assert(
    'T01.1',
    'Visitante consulta catálogo público y recibe HTTP 200 OK',
    'CA-01.1, HU-01',
    catalogRes.status === 200 && Array.isArray(catalogRes.body?.data),
    { status: catalogRes.status, count: catalogRes.body?.count }
  );

  // T01.2 - Every project in public catalog has status === 'PUBLICADO'
  const allPublished =
    catalogRes.body?.data?.length > 0 &&
    catalogRes.body.data.every((p) => p.status === 'PUBLICADO');
  reporter.assert(
    'T01.2',
    'Todos los proyectos retornados en el catálogo público tienen estado PUBLICADO',
    'CA-01.1, CA-01.2',
    allPublished,
    { count: catalogRes.body?.data?.length, statuses: catalogRes.body?.data?.map((p) => p.status) }
  );

  // T01.3 - Zero Trust Security Response Headers on public GET endpoints
  const headers = catalogRes.headers;
  const hasSecurityHeaders =
    headers['x-content-type-options'] === 'nosniff' &&
    headers['x-frame-options'] === 'DENY' &&
    Boolean(headers['strict-transport-security']) &&
    Boolean(headers['cache-control']?.includes('no-store'));

  reporter.assert(
    'T01.3',
    'Verificación de cabeceras de seguridad Zero Trust (nosniff, DENY, HSTS, no-store)',
    'CA-NF01.1, CA-NF11.2',
    hasSecurityHeaders,
    {
      nosniff: headers['x-content-type-options'],
      frameOptions: headers['x-frame-options'],
      hsts: headers['strict-transport-security'],
      cacheControl: headers['cache-control'],
    }
  );

  // Obtain a published project ID for detail inspection
  const sampleProject = catalogRes.body?.data?.[0];
  const sampleProjectId = sampleProject?.projectId;

  // T01.4 - Public project detail returns 200 with complete logical fields
  if (sampleProjectId) {
    const detailRes = await apiRequest('GET', `/v1/projects/${sampleProjectId}`);
    const hasRequiredFields =
      detailRes.body?.data?.projectId === sampleProjectId &&
      typeof detailRes.body?.data?.title === 'string' &&
      typeof detailRes.body?.data?.goalAmountCents === 'number' &&
      detailRes.body?.data?.status === 'PUBLICADO' &&
      detailRes.body?.data?.currency === 'PEN';

    reporter.assert(
      'T01.4',
      'Visitante consulta detalle de proyecto publicado válido (HTTP 200 con campos completos)',
      'CA-02.1, HU-02',
      detailRes.status === 200 && hasRequiredFields,
      { status: detailRes.status, body: detailRes.body?.data }
    );
  }

  // T01.5 - Non-existent project returns 404 NOT_FOUND
  const nonExistentId = randomUUID();
  const notFoundRes = await apiRequest('GET', `/v1/projects/${nonExistentId}`);
  reporter.assert(
    'T01.5',
    'Consulta de identificador de proyecto inexistente devuelve HTTP 404 NOT_FOUND',
    'CA-02.2, HU-02',
    notFoundRes.status === 404 && notFoundRes.body?.code === 'NOT_FOUND',
    { status: notFoundRes.status, body: notFoundRes.body }
  );

  // T01.6 - Gestor creates a BORRADOR; verify draft privacy (hidden from catalog and 404 on detail)
  let draftProjectId = null;
  try {
    const gestor = await getCognitoTokens(CONFIG.USERS.GESTOR.email, CONFIG.USERS.GESTOR.password);
    const draftTitle = `Proyecto Borrador Aislamiento ${Date.now()}`;
    const createDraftRes = await apiRequest('POST', '/v1/projects', {
      headers: { Authorization: `Bearer ${gestor.accessToken}` },
      body: {
        title: draftTitle,
        description: 'Proyecto de prueba para validar que los borradores no se exponen al público',
        goalAmountCents: 80000,
      },
    });

    if (createDraftRes.status === 201) {
      draftProjectId = createDraftRes.body?.data?.projectId;

      // Verify draft is omitted from public catalog
      const catCheckRes = await apiRequest('GET', '/v1/projects');
      const draftFoundInList = catCheckRes.body?.data?.some((p) => p.projectId === draftProjectId);

      // Verify draft returns 404 on public detail
      const draftDetailRes = await apiRequest('GET', `/v1/projects/${draftProjectId}`);

      reporter.assert(
        'T01.6',
        'Proyecto en estado BORRADOR queda completamente excluido del catálogo y devuelve 404',
        'CA-01.2, CA-02.2',
        catCheckRes.status === 200 && !draftFoundInList && draftDetailRes.status === 404,
        {
          draftProjectId,
          foundInCatalog: draftFoundInList,
          draftDetailStatus: draftDetailRes.status,
        }
      );

      // Publish the draft to restore state and verify public availability
      const pubRes = await apiRequest('PATCH', `/v1/projects/${draftProjectId}/publish`, {
        headers: { Authorization: `Bearer ${gestor.accessToken}` },
      });

      const catAfterPub = await apiRequest('GET', '/v1/projects');
      const publishedInList = catAfterPub.body?.data?.some((p) => p.projectId === draftProjectId);

      reporter.assert(
        'T01.7',
        'Al publicar el proyecto (GESTOR), este se incorpora inmediatamente al catálogo público (200)',
        'CA-08.2, HU-08',
        pubRes.status === 200 && publishedInList,
        { pubStatus: pubRes.status, presentInCatalog: publishedInList }
      );
    }
  } catch (err) {
    reporter.assert(
      'T01.6',
      'Proyecto en estado BORRADOR queda completamente excluido del catálogo (Error Gestor Token)',
      'CA-01.2, CA-02.2',
      false,
      { error: err.message }
    );
  }

  // T01.8 - Public project statistics endpoint returns aggregate metrics
  if (sampleProjectId) {
    const statsRes = await apiRequest('GET', `/v1/projects/${sampleProjectId}/stats`);
    const validStats =
      statsRes.status === 200 &&
      typeof statsRes.body?.data?.goalAmountCents === 'number' &&
      typeof statsRes.body?.data?.confirmedAmountCents === 'number' &&
      typeof statsRes.body?.data?.percentageCompleted === 'number' &&
      statsRes.body?.data?.currency === 'PEN';

    reporter.assert(
      'T01.8',
      'Visitante consulta estadísticas agregadas de proyecto publicado (HTTP 200, métricas financieras)',
      'CA-09.1, HU-09',
      validStats,
      { status: statsRes.status, stats: statsRes.body?.data }
    );
  }

  return reporter.summary();
}

// Allow direct standalone CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runTier1Tests()
    .then((summary) => process.exit(summary.failed === 0 ? 0 : 1))
    .catch((err) => {
      console.error('Fatal execution error in Tier 1:', err);
      process.exit(1);
    });
}
