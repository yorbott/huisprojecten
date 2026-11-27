import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { estimate, formatEuro, formatRange, pointsFor } from '../logic';
import {
  addQuote, addStep, deleteProject, removeQuote, removeStep, reopenProject, setGoal, startProject, toggleStep, updateProject, useData, useDerived,
} from '../store';
import { ActionSheet, Icon, parseEuro, STATE_CHIP, STATE_LABEL, StateNode, toast, useClosing } from '../ui';
import type { Nav } from '../App';

export function DetailScreen({ id, nav, onBack }: { id: string; nav: Nav; onBack: () => void }) {
  const data = useData();
  const d = useDerived();
  const p = data.projects[id];
  const { leaving, close } = useClosing(onBack, 230);
  const [menu, setMenu] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [addingQuote, setAddingQuote] = useState(false);
  const [qParty, setQParty] = useState('');
  const [qAmount, setQAmount] = useState('');
  const [notes, setNotes] = useState(p?.notes ?? '');
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!p) onBack();
  }, [p]);
  useEffect(() => {
    const t = window.setTimeout(() => { if (p && notes !== p.notes) updateProject(id, { notes }); }, 400);
    return () => window.clearTimeout(t);
  }, [notes]);
  if (!p) return null;

  const state = d.state[id];
  const traject = d.trajecten.find((t) => t.id === d.trajectOf[id]);
  const est = estimate(p);
  const lowestQuote = p.quotes.length ? Math.min(...p.quotes.map((q) => q.amount)) : undefined;
  const stepsDone = p.steps.filter((s) => s.done).length;
  const waitingOn = p.deps.filter((x) => data.projects[x.id]);
  const dependents = d.dependents[id];
  const hardOpen = waitingOn.filter((x) => x.kind === 'hard' && data.projects[x.id].status !== 'klaar').length;
  const isGoal = data.goalId === id;

  // kostenbalk: schaal tot hoogste bedrag
  const values = [est?.min, est?.max, ...p.quotes.map((q) => q.amount), p.actualCost].filter((v): v is number => v != null);
  const scaleMax = values.length ? Math.max(...values) * 1.15 : 0;
  const pct = (v: number) => `${(v / scaleMax) * 100}%`;

  let costHint = '';
  if (est && p.actualCost != null) costHint = p.actualCost <= est.max ? 'Binnen je schatting' : `${formatEuro(p.actualCost - est.max)} boven je schatting`;
  else if (est && p.quotes.length) {
    const inside = p.quotes.filter((q) => q.amount <= est.max).length;
    costHint = inside === p.quotes.length ? (p.quotes.length === 1 ? 'De offerte valt binnen je schatting' : 'Alle offertes vallen binnen je schatting') : `${p.quotes.length - inside} van ${p.quotes.length} offertes boven je schatting`;
  }

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = t.clientX < 28 ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    if (t.clientX - touch.current.x > 80 && Math.abs(t.clientY - touch.current.y) < 60) close();
    touch.current = null;
  };

  return (
    <div className={`screen pushed${leaving ? ' leaving' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="navbar">
        <button className="nav-btn" onClick={close}><Icon name="chevronLeft" size={22} stroke={2.4} />Terug</button>
        <button className="icon-btn plain" aria-label="Meer opties" onClick={() => setMenu(true)}><Icon name="more" size={20} /></button>
      </div>

      <div className="stack">
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="detail-title">{p.title}</h1>
          <div className="chips">
            {traject && <span className="chip blue">{traject.name} · stap {d.depth[id]} van {traject.steps}</span>}
            <span className={`chip ${STATE_CHIP[state]}`}>{STATE_LABEL[state]}</span>
            {isGoal && <span className="chip blue">Doel</span>}
            {d.route.has(id) && !isGoal && <span className="chip blue">Route naar doel</span>}
            <span className="chip orange">+{pointsFor(p)} pt</span>
            {p.room && <span className="chip on-bg">{p.room}</span>}
            {p.doer && <span className="chip on-bg">{p.doer === 'zelf' ? 'Zelf doen' : 'Vakman'}</span>}
          </div>
        </div>

        {state === 'beschikbaar' && <button className="btn primary" onClick={() => { startProject(id); toast('Project gestart'); }}>Project starten</button>}
        {state === 'bezig' && <button className="btn green" onClick={() => nav.complete(id)}><Icon name="check" size={20} stroke={2.8} />Afronden</button>}
        {state === 'op_slot' && <button className="btn" disabled><Icon name="lock" size={18} />Wacht op {hardOpen} {hardOpen === 1 ? 'project' : 'projecten'}</button>}
        {state === 'klaar' && <button className="btn secondary" onClick={() => reopenProject(id)}>Heropenen</button>}

        <div className="section">
          <div className="section-head"><span className="section-label">Kosten</span></div>
          <div className="card pad stack" style={{ gap: 12 }}>
            <div className="cost-grid">
              <div><div className="k">Schatting</div><div className="v nowrap">{est ? formatRange(est).replace(' – ', '–') : '–'}</div></div>
              <div><div className="k">{p.quotes.length === 1 ? '1 offerte' : `${p.quotes.length} offertes`}</div><div className="v">{lowestQuote != null ? `vanaf ${formatEuro(lowestQuote)}` : '–'}</div></div>
              <div>
                <div className="k">Werkelijk</div>
                <input
                  className="num-input" style={{ width: '100%', textAlign: 'left', padding: '2px 6px', marginLeft: -6, fontWeight: 600, background: 'transparent', fontSize: 15 }}
                  inputMode="numeric" aria-label="Werkelijke kosten" placeholder="–"
                  defaultValue={p.actualCost != null ? formatEuro(p.actualCost) : ''}
                  key={p.actualCost ?? 'leeg'}
                  onBlur={(e) => updateProject(id, { actualCost: parseEuro(e.target.value) })}
                />
              </div>
            </div>
            {scaleMax > 0 && (
              <div className="cost-bar" aria-hidden="true">
                <div className="track" />
                {est && <div className="range" style={{ left: pct(est.min), width: `calc(${pct(est.max)} - ${pct(est.min)})` }} />}
                {p.quotes.map((q) => <div key={q.id} className="mark" style={{ left: pct(q.amount) }} />)}
                {p.actualCost != null && <div className="mark actual" style={{ left: pct(p.actualCost) }} />}
              </div>
            )}
            {costHint && <span className="row-sub">{costHint}</span>}
            {p.quotes.length > 0 && (
              <div style={{ borderTop: '1px solid var(--sep)' }}>
                {p.quotes.map((q) => (
                  <div className="row" key={q.id} style={{ minHeight: 40, padding: '6px 0' }}>
                    <span className="row-main"><span style={{ fontSize: 15 }}>{q.party || 'Offerte'}</span></span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{formatEuro(q.amount)}</span>
                    <button className="del-btn" aria-label={`Offerte ${q.party} verwijderen`} onClick={() => removeQuote(id, q.id)}><Icon name="close" size={16} /></button>
                  </div>
                ))}
              </div>
            )}
            {addingQuote ? (
              <div className="stack fade-in" style={{ gap: 8 }}>
                <input className="search" placeholder="Van wie? (bijv. tegelzetter)" value={qParty} onChange={(e) => setQParty(e.target.value)} autoFocus />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="search" placeholder="Bedrag in €" inputMode="numeric" value={qAmount} onChange={(e) => setQAmount(e.target.value)} />
                  <button className="btn primary" style={{ width: 110, height: 40, fontSize: 15 }} disabled={parseEuro(qAmount) == null}
                    onClick={() => { addQuote(id, qParty.trim(), parseEuro(qAmount)!); setQParty(''); setQAmount(''); setAddingQuote(false); }}>Bewaar</button>
                </div>
              </div>
            ) : (
              <button className="link-btn" style={{ textAlign: 'left', fontSize: 15 }} onClick={() => setAddingQuote(true)}>+ Offerte toevoegen</button>
            )}
          </div>
        </div>

        {(waitingOn.length > 0 || dependents.length > 0) && (
          <div className="section">
            <div className="section-head"><span className="section-label">Afhankelijkheden</span></div>
            <div className="list">
              {waitingOn.map((x) => (
                <button key={x.id} className="row tappable" onClick={() => nav.openProject(x.id)}>
                  {x.kind === 'soft' && data.projects[x.id].status !== 'klaar'
                    ? <span className="node" style={{ border: '2px dashed var(--text-3)' }} />
                    : <StateNode state={d.state[x.id]} />}
                  <span className="row-main"><span style={{ fontSize: 15 }}>{data.projects[x.id].title}</span></span>
                  <span className="row-sub">{x.kind === 'hard' ? 'Moet eerst' : 'Liever eerst'}</span>
                </button>
              ))}
              {dependents.map((dep) => (
                <button key={dep} className="row tappable" onClick={() => nav.openProject(dep)}>
                  <span className="node bezig"><Icon name={d.unlocks[id].includes(dep) ? 'unlock' : 'lock'} size={12} stroke={2.6} /></span>
                  <span className="row-main"><span style={{ fontSize: 15 }}>{data.projects[dep].title}</span></span>
                  <span className="row-sub">{d.unlocks[id].includes(dep) ? 'Gaat hierna open' : 'Wacht hierop'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-head">
            <span className="section-label">Stappen{p.steps.length ? ` · ${stepsDone} van ${p.steps.length}` : ''}</span>
          </div>
          <div className="list">
            {p.steps.map((s) => (
              <div className="row" key={s.id}>
                <button className={`check${s.done ? ' on' : ''}`} aria-label={s.done ? `${s.title} niet klaar` : `${s.title} klaar`} onClick={() => toggleStep(id, s.id)}>
                  {s.done && <Icon name="check" size={12} stroke={3.5} />}
                </button>
                <span className="row-main"><span style={{ fontSize: 15, color: s.done ? 'var(--text-3)' : undefined, textDecoration: s.done ? 'line-through' : undefined }}>{s.title}</span></span>
                <button className="del-btn" aria-label={`Stap ${s.title} verwijderen`} onClick={() => removeStep(id, s.id)}><Icon name="close" size={15} /></button>
              </div>
            ))}
            <form className="inline-add" onSubmit={(e) => { e.preventDefault(); if (newStep.trim()) { addStep(id, newStep.trim()); setNewStep(''); } }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name="plus" size={20} stroke={2.4} /></span>
              <input className="text-input" style={{ fontSize: 16 }} placeholder="Stap toevoegen" value={newStep} onChange={(e) => setNewStep(e.target.value)} enterKeyHint="done" />
            </form>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span className="section-label">Notities</span></div>
          <div className="card pad">
            <textarea className="notes" placeholder="Maten, ideeën, links…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      {menu && (
        <ActionSheet
          onClose={() => setMenu(false)}
          actions={[
            { label: 'Bewerken', onClick: () => nav.openEdit(id) },
            isGoal ? { label: 'Niet meer als doel', onClick: () => setGoal(undefined) } : { label: 'Instellen als doel', onClick: () => { setGoal(id); toast('Doel ingesteld'); } },
            { label: 'Verwijderen', destructive: true, onClick: () => { deleteProject(id); toast('Project verwijderd'); } },
          ]}
        />
      )}
    </div>
  );
}
