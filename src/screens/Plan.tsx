import { useState } from 'react';
import { estimate, formatRange, type Derived, type Traject } from '../logic';
import { useData, useDerived } from '../store';
import type { AppData } from '../types';
import { Icon, ScreenShell, STATE_LABEL, StateNode } from '../ui';
import type { Nav } from '../App';

/** Eén korte regel onder een project, met de vaste woorden Kan nu · Bezig · Wacht · Klaar. */
export function subFor(id: string, data: AppData, d: Derived): string {
  const p = data.projects[id];
  const s = d.state[id];
  if (s === 'klaar') return ['Klaar', p.actualCost != null ? formatRange({ min: p.actualCost, max: p.actualCost }) : ''].filter(Boolean).join(' · ');
  if (s === 'op_slot') {
    const waiting = p.deps.filter((x) => x.kind === 'hard' && data.projects[x.id] && data.projects[x.id].status !== 'klaar');
    return `Wacht op ${waiting.map((x) => data.projects[x.id].title).join(' en ')}`;
  }
  if (s === 'bezig') {
    const done = p.steps.filter((x) => x.done).length;
    return p.steps.length ? `Bezig · ${done} van ${p.steps.length} stappen` : 'Bezig';
  }
  const softOpen = p.deps.filter((x) => x.kind === 'soft' && data.projects[x.id] && data.projects[x.id].status !== 'klaar');
  if (softOpen.length) return `Kan nu · liefst na ${softOpen.map((x) => data.projects[x.id].title).join(' en ')}`;
  return [STATE_LABEL[s], formatRange(estimate(p))].filter(Boolean).join(' · ');
}

export function Row({ id, nav }: { id: string; nav: Nav }) {
  const data = useData();
  const d = useDerived();
  const p = data.projects[id];
  return (
    <button className="row tappable" onClick={() => nav.openProject(id)}>
      <StateNode state={d.state[id]} />
      <span className="row-main">
        <span className="row-title" style={{ color: d.state[id] === 'klaar' ? 'var(--text-2)' : undefined }}>{p.title}</span>
        <span className="row-sub">{subFor(id, data, d)}</span>
      </span>
    </button>
  );
}

/** De route naar het doel als duidelijke stappenlijst. */
function RouteCard({ nav }: { nav: Nav }) {
  const data = useData();
  const d = useDerived();
  const goal = data.goalId ? data.projects[data.goalId] : undefined;
  if (!goal) {
    return (
      <div className="card pad row-sub" style={{ fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ color: 'var(--accent)' }}><Icon name="flag" size={20} /></span>
        Heb je een droomproject? Open het en kies ⋯ › Instellen als doel. Dan zie je hier stap voor stap hoe je er komt.
      </div>
    );
  }
  const left = d.route.size;
  const nextId = d.routeSteps.find((i) => d.state[i] === 'beschikbaar' || d.state[i] === 'bezig');
  return (
    <div className="card route-card">
      <div className="route-head">
        <span className="route-flag"><Icon name="flag" size={18} stroke={2.2} /></span>
        <span className="row-main">
          <span className="row-sub" style={{ fontSize: 13 }}>Jouw doel</span>
          <span style={{ fontSize: 17, fontWeight: 600 }}>{goal.title}</span>
        </span>
        <span style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{goal.status === 'klaar' ? 'Bereikt!' : `nog ${left} ${left === 1 ? 'stap' : 'stappen'}`}</span>
          {goal.status !== 'klaar' && d.routeCost && <span className="row-sub">{formatRange(d.routeCost)}</span>}
        </span>
      </div>
      <ol className="timeline">
        {d.routeSteps.map((id) => {
          const st = d.state[id];
          const isGoal = id === goal.id;
          const isNext = id === nextId;
          return (
            <li key={id} className={`tl-item ${st}${isNext ? ' next' : ''}`}>
              <button className="tl-btn" onClick={() => nav.openProject(id)}>
                <span className="tl-dot">
                  {st === 'klaar' ? <Icon name="check" size={12} stroke={3} /> : isGoal ? <Icon name="flag" size={12} stroke={2.6} /> : null}
                </span>
                <span className="row-main">
                  <span className="tl-title">{data.projects[id].title}</span>
                  <span className="row-sub">
                    {isNext ? (st === 'bezig' ? 'Bezig · hier ben je nu' : 'Kan nu · je volgende stap') : isGoal && st !== 'klaar' ? `${STATE_LABEL[st]} · je doel` : STATE_LABEL[st]}
                  </span>
                </span>
                {isNext && <span className="tl-badge">Volgende</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Compacte kaart per traject; tik om de projecten te zien. */
function TrajectCard({ t, nav }: { t: Traject; nav: Nav }) {
  const data = useData();
  const d = useDerived();
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const complete = t.done === t.ids.length;
  const next = t.ids.find((i) => d.state[i] === 'bezig') ?? t.ids.find((i) => d.state[i] === 'beschikbaar');
  const shown = showDone ? t.ids : t.ids.filter((i) => data.projects[i].status !== 'klaar');
  return (
    <div className="card traject-card">
      <button className="traject-head tappable" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="row-main" style={{ gap: 6 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{t.name}</span>
            <span className="row-sub" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{complete ? 'Klaar' : `stap ${t.currentStep} van ${t.steps}`}</span>
          </span>
          <span className="progress"><span style={{ display: 'block', height: '100%', borderRadius: 3, background: complete ? 'var(--green)' : 'var(--accent)', width: `${(t.done / t.ids.length) * 100}%` }} /></span>
          <span className="row-sub" style={{ fontSize: 13 }}>
            {complete ? `${t.ids.length} projecten afgerond` : [next ? `Kan nu: ${data.projects[next].title}` : 'Wacht op een ander project', t.remaining ? formatRange(t.remaining) : ''].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className={`collapse-btn${open ? ' open' : ''}`}><Icon name="chevronDown" size={16} stroke={2.5} /></span>
      </button>
      {open && (
        <div className="traject-body fade-in">
          {shown.map((id) => <Row key={id} id={id} nav={nav} />)}
          {t.done > 0 && !complete && (
            <button className="link-btn" style={{ fontSize: 14, padding: '10px 0' }} onClick={() => setShowDone(!showDone)}>
              {showDone ? 'Verberg wat al klaar is' : `Toon ook wat al klaar is (${t.done})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LosseKlussen({ nav }: { nav: Nav }) {
  const data = useData();
  const d = useDerived();
  const [open, setOpen] = useState(false);
  const openIds = d.losse.filter((i) => data.projects[i].status !== 'klaar');
  const done = d.losse.length - openIds.length;
  return (
    <div className="card traject-card">
      <button className="traject-head tappable" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="row-main" style={{ gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Losse klussen</span>
          <span className="row-sub" style={{ fontSize: 13 }}>{openIds.length} te doen{done ? ` · ${done} klaar` : ''} · wachten nergens op</span>
        </span>
        <span className={`collapse-btn${open ? ' open' : ''}`}><Icon name="chevronDown" size={16} stroke={2.5} /></span>
      </button>
      {open && <div className="traject-body fade-in">{d.losse.map((id) => <Row key={id} id={id} nav={nav} />)}</div>}
    </div>
  );
}

function Trajecten({ nav }: { nav: Nav }) {
  const d = useDerived();
  return (
    <div className="stack" style={{ gap: 12 }}>
      <RouteCard nav={nav} />
      {(d.trajecten.length > 0 || d.losse.length > 0) && (
        <div className="section-head" style={{ paddingTop: 10 }}><span className="section-label">Alle projecten</span></div>
      )}
      {d.trajecten.map((t) => <TrajectCard key={t.id} t={t} nav={nav} />)}
      {d.losse.length > 0 && <LosseKlussen nav={nav} />}
      {d.trajecten.length === 0 && (
        <p className="row-sub" style={{ fontSize: 13, lineHeight: 1.4, padding: '0 4px', margin: 0 }}>
          Geef bij een project aan waar het op wacht, dan ontstaat hier vanzelf een traject.
        </p>
      )}
    </div>
  );
}

const EFFORTS = ['S', 'M', 'L', 'XL'] as const;
const QUADRANTS = [
  { key: 'q1', name: 'Snelle winst', hint: 'veel impact, weinig moeite' },
  { key: 'q2', name: 'Grote klappers', hint: 'veel impact, veel moeite' },
  { key: 'q3', name: 'Opvullers', hint: 'weinig impact, weinig moeite' },
  { key: 'q4', name: 'Later', hint: 'weinig impact, veel moeite' },
];

function quadrantOf(effort: string, impact: number) {
  const right = effort === 'L' || effort === 'XL';
  const top = impact >= 4;
  return top ? (right ? 'q2' : 'q1') : right ? 'q4' : 'q3';
}

function Matrix({ nav }: { nav: Nav }) {
  const data = useData();
  const d = useDerived();
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [picked, setPicked] = useState<string>();
  const items = Object.values(data.projects)
    .filter((p) => p.status !== 'klaar' && (!onlyOpen || d.state[p.id] !== 'op_slot'))
    .sort((a, b) => (b.impact ?? 3) - (a.impact ?? 3) || EFFORTS.indexOf(a.effort ?? 'M') - EFFORTS.indexOf(b.effort ?? 'M') || a.title.localeCompare(b.title, 'nl'));
  const num = new Map(items.map((p, i) => [p.id, i + 1]));

  // elk vakje (moeite × impact) krijgt een klein raster, zodat bolletjes nooit overlappen
  const cells = new Map<string, string[]>();
  for (const p of items) {
    const key = `${p.effort ?? 'M'}-${p.impact ?? 3}`;
    cells.set(key, [...(cells.get(key) ?? []), p.id]);
  }
  const placed: { id: string; x: number; y: number }[] = [];
  for (const [key, ids] of cells) {
    const [effort, impactS] = key.split('-');
    const col = EFFORTS.indexOf(effort as (typeof EFFORTS)[number]);
    ids.forEach((id, i) => {
      const perRow = 3;
      const cx = (col + 0.5) / 4 * 100 + ((i % perRow) - (Math.min(ids.length, perRow) - 1) / 2) * 7.5;
      // bovenste helft: impact 4–5, onderste helft: impact 1–3
      const impact = Number(impactS);
      const baseY = impact >= 4 ? ((5 - impact + 0.5) / 2) * 50 : 50 + ((3 - impact + 0.5) / 3) * 50;
      const cy = baseY + (Math.floor(i / perRow) - (Math.ceil(ids.length / perRow) - 1) / 2) * 9;
      placed.push({ id, x: cx, y: cy });
    });
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="card" style={{ padding: '14px 14px 10px 30px', position: 'relative' }} onClick={() => setPicked(undefined)}>
        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'rotate(-90deg) translateX(50%)', transformOrigin: 'left top', fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>IMPACT</span>
        <div className="matrix">
          <div className="q q1">Snelle winst</div>
          <div className="q q2">Grote klappers</div>
          <div className="q q3">Opvullers</div>
          <div className="q q4">Later</div>
          {placed.map(({ id, x, y }) => (
            <button key={id} className={`mdot${d.state[id] === 'op_slot' ? ' locked' : ''}${picked === id ? ' picked' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} aria-label={data.projects[id].title} onClick={(e) => { e.stopPropagation(); setPicked(picked === id ? undefined : id); }}>
              {num.get(id)}
            </button>
          ))}
          {picked && (() => {
            const pos = placed.find((q) => q.id === picked);
            if (!pos) return null;
            const below = pos.y < 30;
            return (
              <button
                className={`mtip${below ? ' below' : ''}`}
                style={{ left: `${Math.min(64, Math.max(36, pos.x))}%`, top: `${pos.y}%` }}
                onClick={(e) => { e.stopPropagation(); nav.openProject(picked); }}
              >
                <span className="row-main">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{data.projects[picked].title}</span>
                  <span className="row-sub">{STATE_LABEL[d.state[picked]]} · tik om te openen</span>
                </span>
                <Icon name="chevronRight" size={14} stroke={2.5} />
              </button>
            );
          })()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', paddingTop: 8 }}>
          <span>S</span><span>MOEITE</span><span>XL</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-2)', padding: '0 4px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--accent)' }} />Kan nu</span>
        {!onlyOpen && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, border: '2px solid var(--text-3)' }} />Wacht</span>}
        <button className="link-btn" style={{ marginLeft: 'auto' }} onClick={() => { setOnlyOpen(!onlyOpen); setPicked(undefined); }}>{onlyOpen ? 'Toon ook wat wacht' : 'Alleen wat nu kan'}</button>
      </div>
      {QUADRANTS.map((q) => {
        const ids = items.filter((p) => quadrantOf(p.effort ?? 'M', p.impact ?? 3) === q.key).map((p) => p.id);
        if (!ids.length) return null;
        return (
          <div className="section" key={q.key}>
            <div className="section-head"><span className="section-label">{q.name}</span><span className="section-meta">{q.hint}</span></div>
            <div className="list">
              {ids.map((id) => (
                <button key={id} className="row tappable" onClick={() => nav.openProject(id)}>
                  <span className={`mnum${d.state[id] === 'op_slot' ? ' locked' : ''}`}>{num.get(id)}</span>
                  <span className="row-main">
                    <span className="row-title">{data.projects[id].title}</span>
                    <span className="row-sub">{[STATE_LABEL[d.state[id]], `moeite ${data.projects[id].effort ?? '?'}`, `impact ${data.projects[id].impact ?? '?'}/5`].join(' · ')}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PlanScreen({ nav }: { nav: Nav }) {
  const [mode, setMode] = useState<'trajecten' | 'matrix'>('trajecten');
  const data = useData();
  return (
    <ScreenShell title="Plan" right={<button className="icon-btn filled" aria-label="Nieuw project" onClick={() => nav.openNew()}><Icon name="plus" size={18} stroke={2.5} /></button>}>
      <div className="segmented" style={{ margin: '12px 0' }}>
        <button className={mode === 'trajecten' ? 'on' : ''} onClick={() => setMode('trajecten')}>Trajecten</button>
        <button className={mode === 'matrix' ? 'on' : ''} onClick={() => setMode('matrix')}>Matrix</button>
      </div>
      {Object.keys(data.projects).length === 0 ? (
        <div className="empty"><p>Nog geen projecten. Voeg er een toe met de plusknop.</p></div>
      ) : mode === 'trajecten' ? <Trajecten nav={nav} /> : <Matrix nav={nav} />}
    </ScreenShell>
  );
}

export function RuimtesScreen({ nav }: { nav: Nav }) {
  const data = useData();
  const d = useDerived();
  const groups = new Map<string, string[]>();
  for (const p of Object.values(data.projects)) {
    const r = p.room || 'Zonder ruimte';
    groups.set(r, [...(groups.get(r) ?? []), p.id]);
  }
  const rooms = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'nl'));
  const order = ['bezig', 'beschikbaar', 'op_slot', 'klaar'];
  return (
    <ScreenShell title="Ruimtes" right={<button className="icon-btn filled" aria-label="Nieuw project" onClick={() => nav.openNew()}><Icon name="plus" size={18} stroke={2.5} /></button>}>
      <div className="stack" style={{ marginTop: 14 }}>
        {rooms.length === 0 && <div className="empty"><p>Nog geen projecten.</p></div>}
        {rooms.map((r) => {
          const ids = groups.get(r)!.sort((a, b) => order.indexOf(d.state[a]) - order.indexOf(d.state[b]));
          const done = ids.filter((i) => data.projects[i].status === 'klaar').length;
          return (
            <div className="section" key={r}>
              <div className="section-head">
                <span className="section-label">{r}</span>
                <span className="section-meta">{done} van {ids.length} klaar</span>
              </div>
              <div className="list">{ids.map((id) => <Row key={id} id={id} nav={nav} />)}</div>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}
