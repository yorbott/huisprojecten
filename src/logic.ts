import type { AppData, Effort, Project, ProjectState } from './types';

/* ---------- Punten en huis-level ---------- */

export const EFFORT_POINTS: Record<Effort, number> = { S: 10, M: 30, L: 60, XL: 100 };
const IMPACT_MULT = [0.8, 0.9, 1, 1.1, 1.2];

export function pointsFor(p: Pick<Project, 'effort' | 'impact'>): number {
  const base = EFFORT_POINTS[p.effort ?? 'M'];
  const mult = IMPACT_MULT[Math.min(5, Math.max(1, p.impact ?? 3)) - 1];
  return Math.round(base * mult);
}

/** Totaal aantal punten dat nodig is om level n te bereiken (level 1 = 0). */
export function levelThreshold(n: number): number {
  if (n <= 1) return 0;
  return Math.round(40 * Math.pow(n - 1, 1.6));
}

export interface LevelInfo {
  level: number;
  points: number;
  currentFloor: number;
  nextAt: number;
  toNext: number;
  progress: number; // 0..1 binnen het huidige level
}

export function levelFor(points: number): LevelInfo {
  let level = 1;
  while (levelThreshold(level + 1) <= points) level++;
  const currentFloor = levelThreshold(level);
  const nextAt = levelThreshold(level + 1);
  return {
    level,
    points,
    currentFloor,
    nextAt,
    toNext: nextAt - points,
    progress: (points - currentFloor) / (nextAt - currentFloor),
  };
}

/* ---------- Kosten ---------- */

export interface Range {
  min: number;
  max: number;
}

export function estimate(p: Project): Range | undefined {
  const a = p.costMin;
  const b = p.costMax;
  if (a == null && b == null) return undefined;
  const min = a ?? b!;
  const max = b ?? a!;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

/** Wat een project (nog) kost: werkelijk als klaar, anders laagste offerte of schatting. */
export function expectedCost(p: Project): Range | undefined {
  if (p.status === 'klaar' && p.actualCost != null) return { min: p.actualCost, max: p.actualCost };
  return estimate(p);
}

export function sumRanges(rs: (Range | undefined)[]): Range | undefined {
  let any = false;
  let min = 0;
  let max = 0;
  for (const r of rs) {
    if (!r) continue;
    any = true;
    min += r.min;
    max += r.max;
  }
  return any ? { min, max } : undefined;
}

/* ---------- Afhankelijkheden ---------- */

export interface Traject {
  id: string;
  name: string;
  ids: string[]; // gesorteerd op stap
  steps: number; // aantal stappen (diepte)
  currentStep: number; // eerste stap die nog niet klaar is
  done: number;
  remaining: Range | undefined;
}

export interface Derived {
  state: Record<string, ProjectState>;
  depth: Record<string, number>; // stap binnen traject, 1-based
  trajectOf: Record<string, string | undefined>;
  trajecten: Traject[];
  losse: string[];
  dependents: Record<string, string[]>;
  /** aantal projecten dat open gaat zodra dit project klaar is */
  unlocks: Record<string, string[]>;
  route: Set<string>; // nog-niet-klare projecten op weg naar het doel (incl. doel)
  routeCost: Range | undefined;
  points: number;
  level: LevelInfo;
}

function validDeps(p: Project, projects: Record<string, Project>) {
  return p.deps.filter((d) => d.id !== p.id && projects[d.id]);
}

export function stateOf(p: Project, projects: Record<string, Project>): ProjectState {
  if (p.status === 'klaar') return 'klaar';
  const blocked = validDeps(p, projects).some((d) => d.kind === 'hard' && projects[d.id].status !== 'klaar');
  if (blocked) return 'op_slot';
  return p.status === 'bezig' ? 'bezig' : 'beschikbaar';
}

/** Zou "project wacht op dep" een rondje maken? */
export function wouldCreateCycle(projects: Record<string, Project>, projectId: string, depId: string): boolean {
  if (projectId === depId) return true;
  // rondje als dep (indirect) al op project wacht
  const seen = new Set<string>();
  const stack = [depId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === projectId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const p = projects[cur];
    if (p) for (const d of p.deps) stack.push(d.id);
  }
  return false;
}

function mostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | undefined;
  let n = 0;
  for (const [k, c] of counts) if (c > n) { best = k; n = c; }
  return best;
}

export function derive(data: AppData): Derived {
  const { projects } = data;
  const ids = Object.keys(projects);

  const state: Record<string, ProjectState> = {};
  const dependents: Record<string, string[]> = {};
  for (const id of ids) dependents[id] = [];
  for (const id of ids) {
    state[id] = stateOf(projects[id], projects);
    for (const d of validDeps(projects[id], projects)) dependents[d.id].push(id);
  }

  // diepte = langste pad vanaf een begin-project (rondjes worden genegeerd)
  const depth: Record<string, number> = {};
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    if (depth[id] != null) return depth[id];
    if (visiting.has(id)) return 1;
    visiting.add(id);
    const deps = validDeps(projects[id], projects);
    const d = deps.length ? 1 + Math.max(...deps.map((x) => depthOf(x.id))) : 1;
    visiting.delete(id);
    depth[id] = d;
    return d;
  };
  ids.forEach(depthOf);

  // trajecten = samenhangende groepen (ongericht)
  const comp: Record<string, number> = {};
  const groups: string[][] = [];
  for (const id of ids) {
    if (comp[id] != null) continue;
    const g: string[] = [];
    const stack = [id];
    comp[id] = groups.length;
    while (stack.length) {
      const cur = stack.pop()!;
      g.push(cur);
      const nb = [...validDeps(projects[cur], projects).map((d) => d.id), ...dependents[cur]];
      for (const n of nb) if (comp[n] == null) { comp[n] = groups.length; stack.push(n); }
    }
    groups.push(g);
  }

  const trajectOf: Record<string, string | undefined> = {};
  const trajecten: Traject[] = [];
  const losse: string[] = [];
  const usedNames = new Map<string, number>();
  for (const g of groups) {
    if (g.length === 1) { losse.push(g[0]); continue; }
    const sorted = [...g].sort((a, b) => depth[a] - depth[b] || projects[a].title.localeCompare(projects[b].title, 'nl'));
    const room = mostCommon(g.map((i) => projects[i].room)) ?? 'Project';
    const base = `${room}-traject`;
    const n = (usedNames.get(base) ?? 0) + 1;
    usedNames.set(base, n);
    const name = n > 1 ? `${base} ${n}` : base;
    const steps = Math.max(...g.map((i) => depth[i]));
    const open = g.filter((i) => projects[i].status !== 'klaar');
    const currentStep = open.length ? Math.min(...open.map((i) => depth[i])) : steps;
    const t: Traject = {
      id: sorted[0],
      name,
      ids: sorted,
      steps,
      currentStep,
      done: g.length - open.length,
      remaining: sumRanges(open.map((i) => estimate(projects[i]))),
    };
    trajecten.push(t);
    for (const i of g) trajectOf[i] = t.id;
  }
  trajecten.sort((a, b) => {
    const aDone = a.done === a.ids.length ? 1 : 0;
    const bDone = b.done === b.ids.length ? 1 : 0;
    return aDone - bDone || a.name.localeCompare(b.name, 'nl');
  });
  losse.sort((a, b) => projects[a].title.localeCompare(projects[b].title, 'nl'));

  // wat gaat er open als dit project klaar is?
  const unlocks: Record<string, string[]> = {};
  for (const id of ids) {
    unlocks[id] = projects[id].status === 'klaar' ? [] : dependents[id].filter((dep) => {
      const p = projects[dep];
      if (state[dep] !== 'op_slot') return false;
      const hard = validDeps(p, projects).filter((d) => d.kind === 'hard');
      return hard.some((d) => d.id === id) && hard.every((d) => d.id === id || projects[d.id].status === 'klaar');
    });
  }

  // route naar doel
  const route = new Set<string>();
  const goal = data.goalId && projects[data.goalId] ? data.goalId : undefined;
  if (goal) {
    const stack = [goal];
    while (stack.length) {
      const cur = stack.pop()!;
      if (route.has(cur) || projects[cur].status === 'klaar') continue;
      route.add(cur);
      for (const d of validDeps(projects[cur], projects)) stack.push(d.id);
    }
  }
  const routeCost = sumRanges([...route].map((i) => estimate(projects[i])));

  const points = ids.filter((i) => projects[i].status === 'klaar').reduce((s, i) => s + pointsFor(projects[i]), 0);

  return { state, depth, trajectOf, trajecten, losse, dependents, unlocks, route, routeCost, points, level: levelFor(points) };
}

/** Sortering voor "Beste keuze eerst" op het Nu-scherm. */
export function bestScore(p: Project, d: Derived, projects: Record<string, Project>): number {
  const effortIdx = { S: 0, M: 1, L: 2, XL: 3 }[p.effort ?? 'M'];
  const softOpen = p.deps.filter((x) => x.kind === 'soft' && projects[x.id] && projects[x.id].status !== 'klaar').length;
  return (p.impact ?? 3) * 2 - effortIdx * 1.2 + d.unlocks[p.id].length * 1.5 + (d.route.has(p.id) ? 3 : 0) - softOpen * 2;
}

/* ---------- Opmaak ---------- */

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });

export function formatEuro(n: number): string {
  return eur.format(n).replace(/ /g, ' ');
}

export function formatRange(r: Range | undefined): string {
  if (!r) return '';
  if (r.min === r.max) return formatEuro(r.min);
  return `${formatEuro(r.min)} – ${num.format(r.max)}`;
}
