/* Modelo didáctico. Un lote equivale a los insumos de un robot, sin mermas.
 * Las productividades, demoras y capacidades no son estimaciones de Tesla.
 */
function simulateNetwork(policy = 'network', expansion = true, horizon = 32) {
  const names = ['Materiales', 'Procesamiento', 'Componentes', 'Logística', 'Montaje y pruebas'];
  const workers = [8, 12, 16, 12, 12];
  const modules = [2, 2, 3, 2, 2];
  const stock = [0, 8, 12, 8, 8];
  const projects = Array(5).fill(null);
  let pending = [], total = 0, retained = 0, imported = 0, completedModules = 0;
  const history = [];
  for (let cycle = 1; cycle <= horizon; cycle++) {
    const arrivals = Array(5).fill(0), opened = [];
    pending = pending.filter(p => {
      if (p.ready > cycle) return true;
      workers[p.to] += p.count; arrivals[p.to] += p.count; return false;
    });
    projects.forEach((p, i) => {
      if (p && p.ready <= cycle) { modules[i]++; projects[i] = null; completedModules++; opened.push(i); }
    });
    const beforeStock = [...stock];
    const hardware = modules.map(n => n * 4);
    const started = [];
    if (expansion && policy !== 'none') {
      const committed = workers.map((n, i) => n + pending.filter(p => p.to === i).reduce((a, p) => a + p.count, 0));
      const candidates = [0, 1, 2, 3, 4].filter(i => !projects[i] && modules[i] < 8 && committed[i] >= hardware[i] * 2 + 2);
      candidates.sort((a, b) => Math.min(Math.floor(workers[a] / 2), hardware[a]) - Math.min(Math.floor(workers[b] / 2), hardware[b]) || a - b);
      for (const i of candidates) {
        if (projects.filter(Boolean).length >= 2) break;
        projects[i] = { born: cycle, ready: cycle + 3 }; started.push(i);
      }
    }
    const available = workers.map((n, i) => n - (projects[i] ? 2 : 0));
    const capacity = workers.map((_, i) => Math.min(Math.floor(available[i] / 2), hardware[i]));
    const flow = capacity.map((cap, i) => Math.min(cap, i === 0 ? 32 : beforeStock[i]));
    for (let i = 1; i < 5; i++) stock[i] += flow[i - 1] - flow[i];
    imported += flow[0]; total += flow[4];
    const nextRetained = policy === 'none' ? 0 : Math.floor(total * 0.7);
    const assigned = Array(5).fill(0);
    const projected = workers.map((n, i) => n + pending.filter(p => p.to === i).reduce((a, p) => a + p.count, 0));
    for (let n = retained; n < nextRetained; n++) {
      let target = 4;
      if (policy === 'network') {
        target = [0, 1, 2, 3, 4].sort((a, b) => {
          const futureA = Math.min(Math.floor(projected[a] / 2), hardware[a] + (projects[a] ? 4 : 0));
          const futureB = Math.min(Math.floor(projected[b] / 2), hardware[b] + (projects[b] ? 4 : 0));
          return futureA - futureB || projected[a] - projected[b] || a - b;
        })[0];
      }
      projected[target]++; assigned[target]++;
    }
    assigned.forEach((count, to) => { if (count) pending.push({ to, count, born: cycle, ready: cycle + 2 }); });
    retained = nextRetained;
    const minCapacity = Math.min(...capacity, 32);
    const bottlenecks = capacity.map((n, i) => n === minCapacity ? i : -1).filter(i => i >= 0);
    const inTransit = pending.reduce((n, p) => n + p.count, 0);
    history.push({ cycle, names, workers: [...workers], modules: [...modules], hardware, available, capacity, flow,
      stock: [...stock], beforeStock, projects: projects.map(p => p && { ...p }), pending: pending.map(p => ({ ...p })),
      arrivals, assigned, opened, started, total, retained, exported: total - retained, imported, inTransit,
      completedModules, bottlenecks, initialWorkers: 60, initialStock: 36 });
  }
  return history;
}
if (typeof module !== 'undefined') module.exports = { simulateNetwork };
