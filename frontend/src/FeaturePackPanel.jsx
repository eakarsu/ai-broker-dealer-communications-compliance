import React, { useState } from 'react';
export function formatDisplayValue(v) {
  if (v === null || v === undefined) return '(empty)';
  if (v === '') return '(empty string)';
  if (v === false) return 'false';
  if (v === 0) return '0';
  return String(v);
}
export default function FeaturePackPanel({ request, basePath, tokenKey, kinds }) {
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [risk, setRisk] = useState('');
  const [items, setItems] = useState(null); const [insight, setInsight] = useState(null); const [error, setError] = useState('');
  async function search(e) { e?.preventDefault(); setError(''); try { const p = new URLSearchParams(); if (q) p.set('q', q); if (status) p.set('status', status); if (risk) p.set('risk', risk); const d = await request(`${basePath}?${p}`); setItems(d.items || []); } catch (err) { setError(err.message); } }
  async function download(format) { const token = localStorage.getItem(tokenKey); const r = await fetch(`${basePath}/export?format=${format}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); const blob = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `records.${format}`; a.click(); URL.revokeObjectURL(a.href); }
  async function runInsight(kind) { setError(''); try { setInsight(await request(`${basePath}/insights/${kind}`)); } catch (err) { setError(err.message); } }
  return <section aria-label="Record search, export and deterministic insights">
    <h3>Record search &amp; export</h3>
    <form onSubmit={search}><label>Search <input aria-label="Search records" value={q} onChange={(e) => setQ(e.target.value)} /></label>
    <label>Status / state <input aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} /></label>
    <label>Risk <input aria-label="Filter by risk" value={risk} onChange={(e) => setRisk(e.target.value)} /></label>
    <button type="submit">Search</button></form>
    <div><button type="button" onClick={() => download('csv')}>Export CSV</button><button type="button" onClick={() => download('json')}>Export JSON</button></div>
    {error && <p role="alert">{error}</p>}
    {items && <div><h4>Search results ({formatDisplayValue(items.length)})</h4><ul>{items.map((r) => <li key={r.id}>{formatDisplayValue(r.reference)} — {formatDisplayValue(r.title ?? r.subject)} — amount: {formatDisplayValue(r.amount)} — risk: {formatDisplayValue(r.risk)}</li>)}</ul></div>}
    <h3>Domain insights (deterministic fallback)</h3>
    <p>Label: Deterministic fallback — not AI-generated (aiGenerated: false)</p>
    <div>{(kinds || []).map((k) => <button key={k.id} type="button" onClick={() => runInsight(k.id)}>{k.title}</button>)}</div>
    {insight && <article><h4>{insight.title}</h4><p>{insight.label} · aiGenerated: {formatDisplayValue(insight.aiGenerated)}</p>
    {insight.disclaimer && <p>{insight.disclaimer}</p>}
    <dl>{insight.metrics.map((m) => <div key={m.label}><dt>{m.label}</dt><dd>{formatDisplayValue(m.value)}</dd></div>)}</dl>
    {insight.sections.map((s) => <section key={s.title}><h5>{s.title}</h5><p>{formatDisplayValue(s.detail)}</p></section>)}</article>}
  </section>;
}
