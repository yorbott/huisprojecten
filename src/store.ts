import { useSyncExternalStore } from 'react';
import { derive, pointsFor, stateOf, wouldCreateCycle } from './logic';
import type { AppData, Dep, Project, Quote, Step } from './types';

export const DEFAULT_ROOMS = ['Badkamer', 'Keuken', 'Woonkamer', 'Slaapkamer', 'Zolder', 'Gang en trap', 'Tuin', 'Heel het huis'];

const DB_NAME = 'huisprojecten';
const STORE = 'kv';
const KEY = 'data';

export function emptyData(): AppData {
  return { version: 1, projects: {}, rooms: [] };
}

let data: AppData = emptyData();
let loaded = false;
const listeners = new Set<() => void>();

/* ---------- IndexedDB (met localStorage als reserve) ---------- */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readStored(): Promise<AppData | undefined> {
  try {
    const db = await openDb();
    const value = await new Promise<AppData | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as AppData | undefined);
      req.onerror = () => reject(req.error);
    });
    if (value) return value;
  } catch {
    /* val terug op localStorage */
  }
  try {
    const raw = localStorage.getItem(DB_NAME);
    return raw ? (JSON.parse(raw) as AppData) : undefined;
  } catch {
    return undefined;
  }
}

let saveTimer: number | undefined;
function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    const snapshot = data;
    try {
      const db = await openDb();
      db.transaction(STORE, 'readwrite').objectStore(STORE).put(snapshot, KEY);
    } catch {
      /* negeer */
    }
    try {
      localStorage.setItem(DB_NAME, JSON.stringify(snapshot));
    } catch {
      /* vol of niet beschikbaar */
    }
  }, 150);
}

export async function loadData() {
  const stored = await readStored();
  if (stored && stored.version === 1) data = normalize(stored);
  loaded = true;
  emit();
  // vraag de browser de opslag niet op te ruimen
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* niet ondersteund */
  }
}

function normalize(d: AppData): AppData {
  const projects: Record<string, Project> = {};
  for (const [id, p] of Object.entries(d.projects ?? {})) {
    projects[id] = { ...p, deps: p.deps ?? [], quotes: p.quotes ?? [], steps: p.steps ?? [], notes: p.notes ?? '' };
  }
  return { version: 1, projects, goalId: d.goalId, rooms: d.rooms ?? [], lastUnlock: d.lastUnlock };
}

function emit() {
  derivedCache = undefined;
  listeners.forEach((l) => l());
}

function commit(next: AppData) {
  data = next;
  emit();
  scheduleSave();
}

/* ---------- React hooks ---------- */

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

let derivedCache: { data: AppData; d: ReturnType<typeof derive> } | undefined;

export function useData() {
  const d = useSyncExternalStore(subscribe, () => data);
  return d;
}

export function useLoaded() {
  return useSyncExternalStore(subscribe, () => loaded);
}

export function useDerived() {
  const d = useData();
  if (!derivedCache || derivedCache.data !== d) derivedCache = { data: d, d: derive(d) };
  return derivedCache.d;
}

export function getData() {
  return data;
}

/* ---------- Acties ---------- */

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'quotes' | 'steps' | 'notes'> &
  Partial<Pick<Project, 'quotes' | 'steps' | 'notes'>>;

export function createProject(input: ProjectInput): string {
  const id = uid();
  const now = Date.now();
  const p: Project = { quotes: [], steps: [], notes: '', ...input, id, status: 'open', createdAt: now, updatedAt: now };
  commit({ ...data, projects: { ...data.projects, [id]: p }, rooms: addRoom(data.rooms, p.room) });
  return id;
}

function addRoom(rooms: string[], room: string) {
  if (!room || DEFAULT_ROOMS.includes(room) || rooms.includes(room)) return rooms;
  return [...rooms, room];
}

export function updateProject(id: string, patch: Partial<Project>) {
  const cur = data.projects[id];
  if (!cur) return;
  const next = { ...cur, ...patch, updatedAt: Date.now() };
  commit({ ...data, projects: { ...data.projects, [id]: next }, rooms: addRoom(data.rooms, next.room) });
}

export function deleteProject(id: string) {
  const projects: Record<string, Project> = {};
  for (const [k, p] of Object.entries(data.projects)) {
    if (k === id) continue;
    projects[k] = p.deps.some((d) => d.id === id) ? { ...p, deps: p.deps.filter((d) => d.id !== id) } : p;
  }
  commit({ ...data, projects, goalId: data.goalId === id ? undefined : data.goalId });
}

export function setGoal(id: string | undefined) {
  commit({ ...data, goalId: id });
}

export function startProject(id: string) {
  updateProject(id, { status: 'bezig', startedAt: Date.now() });
}

export interface CompletionResult {
  points: number;
  unlocked: string[];
  levelBefore: number;
  levelAfter: number;
}

export function completeProject(id: string): CompletionResult {
  const before = derive(data);
  const p = data.projects[id];
  const next = { ...p, status: 'klaar' as const, completedAt: Date.now(), updatedAt: Date.now() };
  const projects = { ...data.projects, [id]: next };
  const unlocked = Object.values(projects)
    .filter((x) => before.state[x.id] === 'op_slot' && stateOf(x, projects) !== 'op_slot')
    .map((x) => x.id);
  const nextData: AppData = {
    ...data,
    projects,
    lastUnlock: unlocked.length ? { fromTitle: p.title, ids: unlocked, at: Date.now() } : data.lastUnlock,
  };
  commit(nextData);
  const after = derive(nextData);
  return { points: pointsFor(p), unlocked, levelBefore: before.level.level, levelAfter: after.level.level };
}

export function reopenProject(id: string) {
  updateProject(id, { status: 'open', completedAt: undefined });
}

export function dismissUnlock() {
  commit({ ...data, lastUnlock: undefined });
}

export function canDependOn(projectId: string | undefined, depId: string) {
  if (!projectId) return true; // nieuw project kan nog geen rondje maken
  return !wouldCreateCycle(data.projects, projectId, depId);
}

export function setDeps(id: string, deps: Dep[]) {
  updateProject(id, { deps: deps.filter((d) => canDependOn(id, d.id)) });
}

export function addStep(id: string, title: string) {
  const p = data.projects[id];
  const step: Step = { id: uid(), title, done: false };
  updateProject(id, { steps: [...p.steps, step] });
}

export function toggleStep(id: string, stepId: string) {
  const p = data.projects[id];
  updateProject(id, { steps: p.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) });
}

export function removeStep(id: string, stepId: string) {
  const p = data.projects[id];
  updateProject(id, { steps: p.steps.filter((s) => s.id !== stepId) });
}

export function addQuote(id: string, party: string, amount: number) {
  const p = data.projects[id];
  const q: Quote = { id: uid(), party, amount };
  updateProject(id, { quotes: [...p.quotes, q] });
}

export function removeQuote(id: string, quoteId: string) {
  const p = data.projects[id];
  updateProject(id, { quotes: p.quotes.filter((q) => q.id !== quoteId) });
}

/* ---------- Back-up ---------- */

export function replaceAll(next: AppData) {
  commit(normalize(next));
}

export function exportJson(): string {
  return JSON.stringify(data, null, 2);
}

export function importJson(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as AppData;
    if (parsed.version !== 1 || typeof parsed.projects !== 'object') return false;
    replaceAll(parsed);
    return true;
  } catch {
    return false;
  }
}
