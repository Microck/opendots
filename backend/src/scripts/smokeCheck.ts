type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let json: unknown = null;

  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { response, text, json };
}

async function main() {
  const apiBase = (process.env.SMOKE_API_BASE ?? 'http://127.0.0.1:8788').replace(/\/$/, '');
  const identifier = process.env.SMOKE_BUNDLE_ID?.trim() || process.env.SMOKE_BUNDLE_SLUG?.trim();

  const results: CheckResult[] = [];

  try {
    const { response, json } = await fetchJson(`${apiBase}/api/health`);
    results.push({
      name: 'health',
      ok: response.ok && (json as { status?: string } | null)?.status === 'ok',
      detail: response.ok ? 'ok' : `HTTP ${response.status}`,
    });
  } catch (error) {
    results.push({ name: 'health', ok: false, detail: String(error) });
  }

  let firstBundleIdentifier: string | null = identifier ?? null;

  try {
    const { response, json } = await fetchJson(`${apiBase}/api/bundles`);
    const list = Array.isArray(json) ? json as Array<{ id?: string; slug?: string }> : [];
    if (!firstBundleIdentifier && list[0]) {
      firstBundleIdentifier = list[0].id ?? list[0].slug ?? null;
    }
    results.push({
      name: 'bundle-list',
      ok: response.ok && Array.isArray(json),
      detail: response.ok ? `count=${list.length}` : `HTTP ${response.status}`,
    });
  } catch (error) {
    results.push({ name: 'bundle-list', ok: false, detail: String(error) });
  }

  let selectedDetail: { id?: string; fileIndex?: unknown[]; latestSnapshot?: unknown } | null = null;

  if (firstBundleIdentifier) {
    try {
      const { response, json } = await fetchJson(`${apiBase}/api/bundles/${encodeURIComponent(firstBundleIdentifier)}`);
      const detail = json as { id?: string; fileIndex?: unknown[]; latestSnapshot?: unknown } | null;
      const hasFileIndex = Array.isArray(detail?.fileIndex);
      selectedDetail = response.ok ? detail : null;
      results.push({
        name: 'bundle-detail',
        ok: response.ok && !!detail?.id && hasFileIndex,
        detail: response.ok
          ? `id=${detail?.id ?? 'n/a'} fileIndex=${hasFileIndex ? detail?.fileIndex?.length ?? 0 : 'invalid'}`
          : `HTTP ${response.status}`,
      });
    } catch (error) {
      results.push({ name: 'bundle-detail', ok: false, detail: String(error) });
    }

    if (selectedDetail && !selectedDetail.latestSnapshot) {
      try {
        const { json } = await fetchJson(`${apiBase}/api/bundles`);
        const list = Array.isArray(json) ? json as Array<{ id?: string; slug?: string }> : [];

        for (const candidate of list) {
          const idOrSlug = candidate.id ?? candidate.slug;
          if (!idOrSlug || idOrSlug === firstBundleIdentifier) {
            continue;
          }

          const { response, json: detailJson } = await fetchJson(`${apiBase}/api/bundles/${encodeURIComponent(idOrSlug)}`);
          if (!response.ok) {
            continue;
          }

          const detail = detailJson as { id?: string; latestSnapshot?: unknown } | null;
          if (detail?.latestSnapshot && detail.id) {
            firstBundleIdentifier = idOrSlug;
            selectedDetail = detail as { id?: string; fileIndex?: unknown[]; latestSnapshot?: unknown };
            break;
          }
        }
      } catch {
        // Best-effort fallback only.
      }
    }

    if (!selectedDetail?.latestSnapshot) {
      results.push({
        name: 'bundle-download',
        ok: true,
        detail: 'skipped (no bundle with snapshot found)',
      });
    } else {
      try {
        const response = await fetch(
          `${apiBase}/api/bundles/${encodeURIComponent(firstBundleIdentifier)}/download?variant=project`
        );
        const contentType = response.headers.get('content-type') ?? '';
        results.push({
          name: 'bundle-download',
          ok: response.ok && contentType.includes('application/zip'),
          detail: response.ok ? contentType : `HTTP ${response.status}`,
        });
      } catch (error) {
        results.push({ name: 'bundle-download', ok: false, detail: String(error) });
      }
    }
  }

  for (const result of results) {
    const prefix = result.ok ? '[OK]' : '[FAIL]';
    const detail = result.detail ? ` - ${result.detail}` : '';
    console.log(`${prefix} ${result.name}${detail}`);
  }

  if (results.some((result) => !result.ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[FAIL] smoke-check', error);
  process.exit(1);
});
