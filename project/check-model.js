const assert = require('node:assert/strict');
const { simulateNetwork } = require('./network-model');
for (const policy of ['network', 'assembly', 'none']) {
  for (const expand of [true, false]) {
    const rows = simulateNetwork(policy, expand);
    for (const s of rows) {
      assert.equal(s.workers.reduce((a, n) => a + n, 0) + s.inTransit, 60 + s.retained, 'Conservación de robots');
      assert.equal(s.stock.reduce((a, n) => a + n, 0) + s.total, 36 + s.imported, 'Conservación de lotes');
      assert.equal(s.total, s.retained + s.exported);
      s.flow.forEach((n, i) => {
        assert(n >= 0 && Number.isInteger(n));
        assert(n <= s.capacity[i] && n <= s.hardware[i]);
        if (i) assert(n <= s.beforeStock[i], 'No se consume material antes de su llegada');
      });
      assert(s.stock.every(n => n >= 0));
      assert(s.pending.every(p => p.ready > s.cycle && p.ready === p.born + 2));
      assert(s.projects.filter(Boolean).length <= 2);
      s.projects.forEach((p, i) => {
        assert.equal(s.available[i], s.workers[i] - (p ? 2 : 0), 'Las obras retiran dos robots del trabajo productivo');
        if (p) assert.equal(p.ready, p.born + 3);
      });
      if (!expand) assert.equal(s.completedModules, 0);
    }
    const last = rows.at(-1);
    console.log(policy, { expand, finalRate: last.flow[4], total: last.total, modules: last.completedModules,
      workforce: last.workers, limits: [...new Set(rows.flatMap(s => s.bottlenecks))] });
  }
}
assert(simulateNetwork('network', true).at(-1).total > simulateNetwork('assembly', true).at(-1).total);
assert(simulateNetwork('network', true).at(-1).total > simulateNetwork('network', false).at(-1).total);
console.log('Conservación, demoras, límites y comparación de estrategias: OK');
