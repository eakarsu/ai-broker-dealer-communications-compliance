// Feature pack: search/filter, CSV/JSON export, deterministic domain insights.
// Never calls a provider. Insights are labelled deterministic fallbacks.
export const DOMAIN_KINDS = [{"id": "comms-risk-triage", "title": "Communications risk triage", "detail": "Flags high-risk communications awaiting principal review."}, {"id": "retention-gap-check", "title": "Retention & supervision gap check", "detail": "Counts open records by risk and state to surface retention gaps."}, {"id": "filing-readiness", "title": "Filing & disclosure readiness", "detail": "Summarises amounts and overdue items before filing."}];
export const DISCLAIMER = "";
export function parseListQuery(query = {}) {
  return { q: String(query.q || '').trim().toLowerCase(), status: String(query.status || '').trim(), risk: String(query.risk || '').trim() };
}
export function filterRecords(rows, query = {}) {
  const { q, status, risk } = parseListQuery(query);
  return (rows || []).filter((r) => {
    if (status && String(r.status ?? r.state ?? '') !== status) return false;
    if (risk && String(r.risk ?? '') !== risk) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    return true;
  });
}
export function recordsToCsv(rows) {
  const cols = [...new Set((rows || []).flatMap((r) => Object.keys(r || {})))];
  const esc = (v) => { const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v)); return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s; };
  return [cols.join(','), ...(rows || []).map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}
export function formatDisplayValue(v) {
  if (v === null || v === undefined) return '(empty)';
  if (v === '') return '(empty string)';
  if (v === false) return 'false';
  if (v === 0) return '0';
  return String(v);
}
export function buildInsight(kindId, rows) {
  const kind = DOMAIN_KINDS.find((k) => k.id === kindId) || DOMAIN_KINDS[0];
  const list = rows || [];
  const totalAmount = list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const highRisk = list.filter((r) => ['High', 'Critical'].includes(r.risk)).length;
  const open = list.filter((r) => !['Approved', 'Closed', 'approved', 'closed'].includes(r.status ?? r.state)).length;
  const now = Date.now();
  const overdue = list.filter((r) => r.due_date && new Date(r.due_date).getTime() < now && !['Approved', 'Closed', 'approved', 'closed'].includes(r.status ?? r.state)).length;
  return {
    aiGenerated: false, source: 'deterministic-fallback',
    label: 'Deterministic fallback — not AI-generated',
    kind: kind.id, title: kind.title, summary: kind.detail,
    disclaimer: DISCLAIMER || undefined,
    metrics: [
      { label: 'Records considered', value: list.length },
      { label: 'Total amount', value: totalAmount },
      { label: 'High-risk records', value: highRisk },
      { label: 'Open records', value: open },
      { label: 'Overdue records', value: overdue },
    ],
    sections: [
      { title: 'What was checked', detail: kind.detail },
      { title: 'Counts (preserved values)', detail: `records=${list.length}; totalAmount=${totalAmount}; highRisk=${highRisk}; open=${open}; overdue=${overdue}` },
      { title: 'Next step', detail: 'Review the listed records in the main list, assign an owner, and retain evidence before any external action.' },
    ],
    references: list.slice(0, 10).map((r) => r.reference || String(r.id ?? '')),
  };
}
export function sendExport(res, rows, format, filename = 'records') {
  if (String(format).toLowerCase() === 'csv') {
    res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(recordsToCsv(rows));
  }
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
  return res.json({ items: rows, count: rows.length });
}

export function mountFeaturePack(app, { pool }) {
  app.get('/api/records/export', async (req, res) => {
    const rows = (await pool.query('SELECT * FROM workflow_cases ORDER BY due_date')).rows;
    return sendExport(res, filterRecords(rows, req.query), req.query.format || 'json', 'records');
  });
  app.get('/api/records/insights/:kind', async (req, res) => {
    const rows = (await pool.query('SELECT * FROM workflow_cases ORDER BY due_date')).rows;
    res.json(buildInsight(req.params.kind, rows));
  });
}
