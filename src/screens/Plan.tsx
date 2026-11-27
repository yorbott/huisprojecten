import { useState } from 'react';
import { estimate, formatRange, type Derived } from '../logic';
import { useData, useDerived } from '../store';
import type { AppData } from '../types';
import { Icon, STATE_LABEL, StateNode } from '../ui';
import type { Nav } from '../App';

function subFor(id: string, data: AppData, d: Derived): string {
  const p = data.projects[id];
  const s = d.state[id];
  if (s === 'klaar') return ['Klaar', p.actualCost != null ? formatRange({ min: p.actualCost, max: p.actualCost }) : ''].filter(Boolean).join(' · ');
  if (s === 'op_slot') {
    const waiting = p.deps.filter((x) => x.kind === 'hard' && data.projects[x.id] && data.projects[x.id].status !== 'klaar');
    return `Wacht op ${waiting.map((x) => data.projects[x.id].title).join(', ')}`;
  }
  if (s === 'bezig') {
    const done = p.steps.filter((x) => x.done).length;
    return p.steps.length ? `Bezig · ${done} van ${p.steps.length} stappen` : 'Bezig';
  }
  const softOpen = p.deps.filter((x) => x.kind === 'soft' && data.projects[x.id] && data.projects[x.id].status !== 'klaar');
  if (softOpen.length) return `Beschikbaar · liever na ${softOpen.map((x) => data.projects[x.id].title).join(', ')}`;
  return [STATE_LABEL[s], formatRange(estimate(p))].filter(Boolean).join(' · ');
}

function Row({ id, nav }: { id: string; nav: Nav }) {
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
                    {st === 'klaar' ? 'Klaar' : isNext ? (st === 'bezig' ? 'Hier ben je nu mee bezig' : 'Dit is je volgende stap') : isGoal ? 'Je doel' : st === 'op_slot' ? 'Daarna' : 'Kan ook al'}
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

function Trajecten({ nav }: { nav: Nav }) {
  const data = useData();
  const d = useDerived();
  const [losseOpen, setLosseOpen] = useState(false);
  const losseOpenCount = d.losse.filter((i) => data.projects[i].status !== 'klaar').length;

  return (
    <div className="stack" style={{ gap: 12 }}>
      <RouteCard nav={nav} />

      {d.losse.length > 0 && (
        <div className="section">
          <button className="card pad tappable" style={{ border: 0, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontSize: 'inherit', padding: '12px 14px' }} onClick={() => setLosseOpen(!losseOpen)} aria-expanded={losseOpen}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}><Icon name="list" size={14} stroke={2.4} /></span>
            <span className="row-main">
              <span style={{ fontSize: 15, fontWeight: 600 }}>Losse klussen</span>
              <span className="row-sub" style={{ fontSize: 13 }}>{losseOpenCount} open · {d.losse.length - losseOpenCount} klaar</span>
            </span>
            <span className={`collapse-btn${losseOpen ? ' open' : ''}`}><Icon name="chevronDown" size={16} stroke={2.5} /></span>
          </button>
          {losseOpen && (
            <div className="list fade-in">
              {d.losse.map((id) => <Row key={id} id={id} nav={nav} />)}
            </div>
          )}
        </div>
      )}

      {d.trajecten.map((t) => {
        const complete = t.done === t.ids.length;
        return (
          <div className="section" key={t.id}>
            <div className="section-head">
              <span className="section-label" style={{ color: complete ? 'var(--green-text)' : 'var(--accent-text)' }}>{t.name}</span>
              <span className="section-meta">
                {complete ? 'Afgerond' : `Stap ${t.currentStep} van ${t.steps}${t.remaining ? ` · ${formatRange(t.remaining)}` : ''}`}
              </span>
            </div>
            <div className="list">
              {t.ids.map((id) => <Row key={id} id={id} nav={nav} />)}
            </div>
          </div>
        );
      })}

      {d.trajecten.length === 0 && (
        <div className="card pad row-sub" style={{ fontSize: 14, lineHeight: 1.4 }}>
          Nog geen trajecten. Zodra je bij een project aangeeft waar het op wacht, verschijnt hier vanzelf een traject.
        </div>
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
  const [onlyOpen, setOnlyOpen] = useState(false);
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
      <div className="card" style={{ padding: '14px 14px 10px 30px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'rotate(-90deg) translateX(50%)', transformOrigin: 'left top', fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>IMPACT</span>
        <div className="matrix">
          <div className="q q1">Snelle winst</div>
          <div className="q q2">Grote klappers</div>
          <div className="q q3">Opvullers</div>
          <div className="q q4">Later</div>
          {placed.map(({ id, x, y }) => (
            <button key={id} className={`mdot${d.state[id] === 'op_slot' ? ' locked' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} aria-label={data.projects[id].title} onClick={() => nav.openProject(id)}>
              {num.get(id)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', paddingTop: 8 }}>
          <span>S</span><span>MOEITE</span><span>XL</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-2)', padding: '0 4px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--accent)' }} />Beschikbaar</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, border: '2px solid var(--text-3)' }} />Op slot</span>
        <button className="link-btn" style={{ marginLeft: 'auto' }} onClick={() => setOnlyOpen(!onlyOpen)}>{onlyOpen ? 'Toon alles' : 'Alleen beschikbaar'}</button>
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
    <div className="screen fade-in">
      <div className="navbar">
        <span />
        <button className="icon-btn filled" aria-label="Nieuw project" onClick={() => nav.openNew()}><Icon name="plus" size={18} stroke={2.5} /></button>
      </div>
      <h1 className="large-title">Plan</h1>
      <div className="segmented" style={{ margin: '12px 0' }}>
        <button className={mode === 'trajecten' ? 'on' : ''} onClick={() => setMode('trajecten')}>Trajecten</button>
        <button className={mode === 'matrix' ? 'on' : ''} onClick={() => setMode('matrix')}>Matrix</button>
      </div>
      {Object.keys(data.projects).length === 0 ? (
        <div className="empty"><p>Nog geen projecten. Voeg er een toe met de plusknop.</p></div>
      ) : mode === 'trajecten' ? <Trajecten nav={nav} /> : <Matrix nav={nav} />}
    </div>
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
  return (
    <div className="screen fade-in">
      <div className="navbar"><span /></div>
      <h1 className="large-title">Ruimtes</h1>
      <div className="stack" style={{ marginTop: 14 }}>
        {rooms.length === 0 && <div className="empty"><p>Nog geen projecten.</p></div>}
        {rooms.map((r) => {
          const ids = groups.get(r)!.sort((a, b) => ['bezig', 'beschikbaar', 'op_slot', 'klaar'].indexOf(d.state[a]) - ['bezig', 'beschikbaar', 'op_slot', 'klaar'].indexOf(d.state[b]));
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
        <p className="row-sub" style={{ textAlign: 'center', fontSize: 12 }}>Het tegeloverzicht met foto's komt in de volgende versie.</p>
      </div>
    </div>
  );
}

export function IdeeenScreen() {
  return (
    <div className="screen fade-in">
      <div className="navbar"><span /></div>
      <h1 className="large-title">Ideeën</h1>
      <div className="empty">
        <span style={{ color: 'var(--accent)' }}><Icon name="bulb" size={40} stroke={1.6} /></span>
        <h2>Komt in de volgende versie</h2>
        <p>Hier kun je straks snel een inval vastleggen met een foto of link, en die later met één veeg omzetten in een project.</p>
      </div>
    </div>
  );
}
