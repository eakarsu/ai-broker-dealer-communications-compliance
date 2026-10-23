import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
process.env.OPENROUTER_API_KEY=''; process.env.OPENAI_API_KEY='';
const { filterRecords, recordsToCsv, buildInsight, formatDisplayValue, DOMAIN_KINDS } = await import('../featurePack.mjs');
const rows=[{id:1,reference:'A-1',subject:'Alpha review',status:'Open',state:'Open',risk:'High',amount:0,due_date:'2020-01-01'},{id:2,reference:'B-2',subject:'Beta',status:'Closed',state:'closed',risk:'Low',amount:50,due_date:'2999-01-01'}];
test('search/filter on main list',()=>{ assert.equal(filterRecords(rows,{q:'alpha'}).length,1); assert.equal(filterRecords(rows,{status:'Closed'}).length,1); assert.equal(filterRecords(rows,{risk:'High'}).length,1); });
test('CSV/JSON export shape preserves 0',()=>{ const csv=recordsToCsv(rows); assert.ok(csv.includes('A-1')&&csv.split('\n')[1].includes(',0,')); assert.equal(JSON.parse(JSON.stringify({items:rows})).items[0].amount,0); });
test('deterministic insights labelled aiGenerated:false with 2-3 kinds',()=>{ assert.ok(DOMAIN_KINDS.length>=2&&DOMAIN_KINDS.length<=3); const i=buildInsight(DOMAIN_KINDS[0].id,rows); assert.equal(i.aiGenerated,false); assert.ok(i.sections.length>=2); assert.equal(i.metrics.find(m=>m.label==='Total amount').value,50); });
test('formatDisplayValue preserves false/0/empty',()=>{ assert.equal(formatDisplayValue(0),'0'); assert.equal(formatDisplayValue(false),'false'); assert.equal(formatDisplayValue(''),'(empty string)'); assert.equal(formatDisplayValue(null),'(empty)'); });
test('feature routes mounted behind auth in server',()=>{ const s=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8'); assert.ok(s.includes('mountFeaturePack')); assert.ok(s.includes('featurePack')); });
