export type Effort = 'S' | 'M' | 'L' | 'XL';
export type DepKind = 'hard' | 'soft';
export type Status = 'open' | 'bezig' | 'klaar';
export type Doer = 'zelf' | 'vakman';

/** Dit project wacht op project `id`. hard = moet eerst, soft = liever eerst. */
export interface Dep {
  id: string;
  kind: DepKind;
}

export interface Step {
  id: string;
  title: string;
  done: boolean;
}

export interface Quote {
  id: string;
  party: string;
  amount: number;
}

export interface Project {
  id: string;
  title: string;
  room: string;
  status: Status;
  deps: Dep[];
  effort?: Effort;
  /** 1 t/m 5 */
  impact?: number;
  costMin?: number;
  costMax?: number;
  quotes: Quote[];
  actualCost?: number;
  doer?: Doer;
  steps: Step[];
  notes: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface UnlockNotice {
  fromTitle: string;
  ids: string[];
  at: number;
}

export interface Idea {
  id: string;
  text: string;
  createdAt: number;
}

export interface AppData {
  version: 1;
  projects: Record<string, Project>;
  goalId?: string;
  rooms: string[];
  lastUnlock?: UnlockNotice;
  ideas: Idea[];
}

export type ProjectState = 'klaar' | 'bezig' | 'beschikbaar' | 'op_slot';
