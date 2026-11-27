import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { estimate, formatEuro, formatRange, pointsFor } from '../logic';
import {
  addQuote, addStep, deleteProject, removeQuote, removeStep, reopenProject, setGoal, startProject, toggleStep, updateProject, useData, useDerived,
} from '../store';
import { ActionSheet, formatDate, Icon, parseEuro, STATE_CHIP, STATE_LABEL, StateNode, SwipeRow, toast, useClosing } from '../ui';
import type { Nav } from '../App';

export function DetailScreen({ id, nav, onBack, depth = 0 }: { id: string; nav: Nav; onBack: () => void; depth?: number }) {
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
  const [notesOpen, setNotesOpen] = useState(false);
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
  const stepsDone = p.steps.filter((s) => s.done).length;
  const waitingOn = p.deps.filter((x) => data.projects[x.id]);
  const blockers = waitingOn.filter((x) => x.kind === 'hard' && data.projects[x.id].status !== 'klaar');
  const otherDeps = waitingOn.filter((x) => !blockers.includes(x));
  const dependents = d.dependents[id];
  const isGoal = data.goalId === id;
  const showActual = state === 'bezig' || state === 'klaar';

  // kostenbalk alleen als er iets te vergelijken valt
  const values = [est?.min, est?.max, ...p.quotes.map((q) => q.amount), p.actualCost].filter((v): v is number => v != null);
  const showBar = !!est && (p.quotes.length > 0 || p.actualCost != null);
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

  // Stappen sturen het project: eerste vinkje = gestart, alle vinkjes = klaar, vinkje weg bij een klaar project = weer bezig.
  const onToggleStep = (stepId: string) => {
    const step = p.steps.find((x) => x.id === stepId);
    if (!step) return;
    const checking = !step.done;
    toggleStep(id, stepId);
    if (checking && state === 'beschikbaar') startProject(id);
    if (!checking && state === 'klaar') { reopenProject(id); toast('Project staat weer op Bezig'); }
    const allDone = p.steps.every((x) => (x.id === stepId ? checking : x.done));
    if (checking && allDone && state !== 'klaar' && state !== 'op_slot') window.setTimeout(() => nav.complete(id), 450);
  };

  const depRow = (depId: string, sub: string, dashed?: boolean) => (
    <button key={depId} className="row tappable" onClick={() => nav.openProject(depId)}>
      {dashed ? <span className="node" style={{ border: '2px dashed var(--text-3)' }} /> : <StateNode state={d.state[depId]} />}
      <span className="row-main">
        <span style={{ fontSize: 15 }}>{data.projects[depId].title}</span>
        <span className="row-sub">{sub}</span>
      </span>
      <span className="chev"><Icon name="chevronRight" size={14} stroke={2.5} /></span>
    </button>
  );

  return (
    <div className={`screen pushed${leaving ? ' leaving' : ''}`} style={{ zIndex: 20 + depth }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="navbar">
        <button className="nav-btn" onClick={close}><Icon name="chevronLeft" size={22} stroke={2.4} />Terug</button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="nav-btn" onClick={() => nav.openEdit(id)}>Wijzig</button>
          <button className="icon-btn plain" aria-label="Meer opties" onClick={() => setMenu(true)}><Icon name="more" size={20} /></button>
        </span>
      </div>

      <div className="stack">
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="detail-title">{p.title}</h1>
          <p className="row-sub" style={{ fontSize: 15, margin: 0 }}>
            {[p.room, p.doer === 'zelf' ? 'Zelf doen' : p.doer === 'vakman' ? 'Vakman' : '', `+${pointsFor(p)} punten`].filter(Boolean).join(' · ')}
          </p>
          <div className="chips">
            <span className={`chip ${STATE_CHIP[state]}`}>{STATE_LABEL[state]}</span>
            {isGoal ? <span className="chip blue">Jouw doel</span> : d.route.has(id) ? <span className="chip blue">Op weg naar je doel</span> : null}
            {traject && <span className="chip on-bg">{traject.name} · stap {d.depth[id]} van {traject.steps}</span>}
          </div>
        </div>

        {state === 'beschikbaar' && <button className="btn primary" onClick={() => { startProject(id); toast('Project gestart'); }}>Project starten</button>}
        {state === 'bezig' && <button className="btn green" onClick={() => nav.complete(id)}><Icon name="check" size={20} stroke={2.8} />Afronden</button>}
        {state === 'op_slot' && (
          <div className="card status-card wait">
            <div className="status-title"><Icon name="lock" size={16} stroke={2.4} />Kan pas beginnen als dit klaar is</div>
            <div>{blockers.map((x) => depRow(x.id, STATE_LABEL[d.state[x.id]]))}</div>
          </div>
        )}
        {state === 'klaar' && (
          <div className="card status-card done">
            <div className="status-title" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="check" size={16} stroke={3} />Klaar{p.completedAt ? ` op ${formatDate(p.completedAt)}` : ''}</span>
              <button className="link-btn" style={{ fontSize: 14, fontWeight: 600 }} onClick={() => { reopenProject(id); toast('Project staat weer open'); }}>Niet klaar</button>
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-head"><span className="section-label">Kosten</span></div>
          <div className="list">
            <div className="form-row">
              <span className="label">Schatting</span>
              {est ? <span style={{ fontSize: 16, fontWeight: 600 }}>{formatRange(est)}</span> : <button className="link-btn" style={{ fontSize: 15 }} onClick={() => nav.openEdit(id)}>Toevoegen</button>}
            </div>
            {p.quotes.map((q) => (
              <SwipeRow key={q.id} className="form-row" actions={[{ label: 'Verwijder', onClick: () => removeQuote(id, q.id) }]}>
                <span className="label">{q.party || 'Offerte'}</span>
                <span style={{ fontSize: 16 }}>{formatEuro(q.amount)}</span>
              </SwipeRow>
            ))}
            {addingQuote ? (
              <div className="stack fade-in" style={{ gap: 8, padding: '10px 0' }}>
                <input className="search" placeholder="Van wie? Bijvoorbeeld een tegelzetter" value={qParty} onChange={(e) => setQParty(e.target.value)} autoFocus />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="search" placeholder="Bedrag in €" inputMode="numeric" value={qAmount} onChange={(e) => setQAmount(e.target.value)} />
                  <button className="btn primary" style={{ width: 110, height: 40, fontSize: 15 }} disabled={parseEuro(qAmount) == null}
                    onClick={() => { addQuote(id, qParty.trim(), parseEuro(qAmount)!); setQParty(''); setQAmount(''); setAddingQuote(false); }}>Bewaar</button>
                </div>
              </div>
            ) : (
              <div className="form-row">
                <button className="link-btn" style={{ fontSize: 15 }} onClick={() => setAddingQuote(true)}>Offerte toevoegen</button>
              </div>
            )}
            {showActual && (
              <div className="form-row">
                <label className="label" htmlFor={`werkelijk-${id}`}>Werkelijk betaald</label>
                <input
                  id={`werkelijk-${id}`} className="num-input" style={{ width: 120 }}
                  inputMode="numeric" placeholder="Optioneel"
                  defaultValue={p.actualCost != null ? formatEuro(p.actualCost) : ''}
                  key={p.actualCost ?? 'leeg'}
                  onBlur={(e) => updateProject(id, { actualCost: parseEuro(e.target.value) })}
                />
              </div>
            )}
          </div>
          {showBar && (
            <div style={{ padding: '6px 4px 0' }}>
              <div className="cost-bar" aria-hidden="true">
                <div className="track" />
                {est && <div className="range" style={{ left: pct(est.min), width: `calc(${pct(est.max)} - ${pct(est.min)})` }} />}
                {p.quotes.map((q) => <div key={q.id} className="mark" style={{ left: pct(q.amount) }} />)}
                {p.actualCost != null && <div className="mark actual" style={{ left: pct(p.actualCost) }} />}
              </div>
              {costHint && <span className="row-sub">{costHint}</span>}
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-head">
            <span className="section-label">Stappen{p.steps.length ? ` · ${stepsDone} van ${p.steps.length}` : ''}</span>
          </div>
          <div className="list" style={{ overflow: 'hidden' }}>
            {p.steps.map((s) => (
              <SwipeRow key={s.id} actions={[{ label: 'Verwijder', onClick: () => removeStep(id, s.id) }]}>
                <button className={`check${s.done ? ' on' : ''}`} aria-label={s.done ? `${s.title} niet klaar` : `${s.title} klaar`} onClick={() => onToggleStep(s.id)}>
                  {s.done && <Icon name="check" size={12} stroke={3.5} />}
                </button>
                <span className="row-main"><span style={{ fontSize: 15, color: s.done ? 'var(--text-3)' : undefined, textDecoration: s.done ? 'line-through' : undefined }}>{s.title}</span></span>
              </SwipeRow>
            ))}
            <form className="inline-add" onSubmit={(e) => { e.preventDefault(); if (newStep.trim()) { addStep(id, newStep.trim()); setNewStep(''); } }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name="plus" size={20} stroke={2.4} /></span>
              <input className="text-input" style={{ fontSize: 16 }} placeholder="Stap toevoegen" value={newStep} onChange={(e) => setNewStep(e.target.value)} enterKeyHint="done" />
            </form>
          </div>
        </div>

        {(otherDeps.length > 0 || dependents.length > 0) && (
          <div className="section">
            <div className="section-head"><span className="section-label">Gekoppelde projecten</span></div>
            <div className="list">
              {otherDeps.map((x) => depRow(x.id, data.projects[x.id].status === 'klaar' ? 'Klaar · moest eerst' : 'Liefst eerst · niet verplicht', x.kind === 'soft' && data.projects[x.id].status !== 'klaar'))}
              {dependents.map((dep) => depRow(dep, d.state[dep] === 'op_slot' ? (d.unlocks[id].includes(dep) ? 'Wacht · kan na dit project' : 'Wacht · ook op een ander project') : `${STATE_LABEL[d.state[dep]]} · volgt hierop`))}
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-head"><span className="section-label">Notities</span></div>
          {notes || notesOpen ? (
            <div className="card pad">
              <textarea className="notes" placeholder="Maten, ideeën, links…" value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus={notesOpen && !notes} onBlur={() => setNotesOpen(false)} />
            </div>
          ) : (
            <button className="card pad link-btn" style={{ fontSize: 15, textAlign: 'left' }} onClick={() => setNotesOpen(true)}>Notitie toevoegen</button>
          )}
        </div>
      </div>

      {menu && (
        <ActionSheet
          onClose={() => setMenu(false)}
          actions={[
            isGoal ? { label: 'Niet meer als doel', onClick: () => setGoal(undefined) } : { label: 'Instellen als doel', onClick: () => { setGoal(id); toast('Doel ingesteld'); } },
            ...(state === 'klaar' ? [{ label: 'Markeer als niet klaar', onClick: () => { reopenProject(id); toast('Project staat weer open'); } }] : []),
            { label: 'Verwijderen', destructive: true, onClick: () => { deleteProject(id); toast('Project verwijderd'); } },
          ]}
        />
      )}
    </div>
  );
}
