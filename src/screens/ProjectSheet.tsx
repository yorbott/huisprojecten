import { useMemo, useState } from 'react';
import { derive, formatRange } from '../logic';
import { canDependOn, createProject, DEFAULT_ROOMS, getData, updateProject, useData } from '../store';
import type { Dep, Doer, Effort, Project } from '../types';
import { EFFORT_HINT, Icon, IMPACT_HINT, parseEuro, Sheet } from '../ui';

export interface SheetPrefill {
  title?: string;
  room?: string;
  /** idee waar dit project uit voortkomt; wordt opgeruimd na aanmaken */
  ideaId?: string;
}

export function ProjectSheet({ editId, prefill, onClose, onCreated }: { editId?: string; prefill?: SheetPrefill; onClose: () => void; onCreated?: (id: string) => void }) {
  const data = useData();
  const existing = editId ? data.projects[editId] : undefined;
  const [title, setTitle] = useState(existing?.title ?? prefill?.title ?? '');
  const [room, setRoom] = useState(existing?.room ?? prefill?.room ?? '');
  const [deps, setDeps] = useState<Dep[]>(existing?.deps ?? []);
  const [effort, setEffort] = useState<Effort | undefined>(existing?.effort);
  const [impact, setImpact] = useState<number | undefined>(existing?.impact);
  const [costMin, setCostMin] = useState(existing?.costMin?.toString() ?? '');
  const [costMax, setCostMax] = useState(existing?.costMax?.toString() ?? '');
  const [doer, setDoer] = useState<Doer | undefined>(existing?.doer);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState('');

  const rooms = useMemo(() => {
    const used = Object.values(data.projects).map((p) => p.room).filter(Boolean);
    const all = [...DEFAULT_ROOMS, ...data.rooms, ...used];
    if (room) all.push(room);
    return [...new Set(all)];
  }, [data, room]);

  const candidates = Object.values(data.projects)
    .filter((p) => p.id !== editId && !deps.some((x) => x.id === p.id) && canDependOn(editId, p.id))
    .filter((p) => !query || p.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(a.status === 'klaar') - Number(b.status === 'klaar') || Number(b.room === room) - Number(a.room === room) || a.title.localeCompare(b.title, 'nl'));

  const suggestion = room
    ? Object.values(data.projects)
        .filter((p) => p.room === room && p.status !== 'klaar' && p.id !== editId && !deps.some((x) => x.id === p.id) && canDependOn(editId, p.id))
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
    : undefined;

  // live voorbeeld: waar komt dit project terecht?
  const preview = useMemo(() => {
    if (!deps.length) return undefined;
    const tmpId = editId ?? '__nieuw__';
    const base = getData();
    const tmp: Project = { ...(existing ?? { id: tmpId, quotes: [], steps: [], notes: '', createdAt: 0, updatedAt: 0, status: 'open' as const }), id: tmpId, title: title || 'Dit project', room, deps } as Project;
    const d = derive({ ...base, projects: { ...base.projects, [tmpId]: tmp } });
    const t = d.trajecten.find((x) => x.id === d.trajectOf[tmpId]);
    const blockers = deps.filter((x) => x.kind === 'hard' && base.projects[x.id]?.status !== 'klaar').map((x) => base.projects[x.id]?.title).filter(Boolean);
    return { step: d.depth[tmpId], name: t?.name, blockers };
  }, [deps, room, title, data]);

  const valid = title.trim().length > 0;

  const save = (close: () => void) => {
    if (!valid) return;
    const fields = {
      title: title.trim(),
      room,
      deps,
      effort,
      impact,
      costMin: parseEuro(costMin),
      costMax: parseEuro(costMax),
      doer,
    };
    if (editId) {
      updateProject(editId, fields);
      close();
    } else {
      const id = createProject(fields);
      close();
      window.setTimeout(() => onCreated?.(id), 260);
    }
  };

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <div className="sheet-header">
            <button style={{ textAlign: 'left' }} onClick={close}>Annuleer</button>
            <span className="title">{editId ? 'Bewerk project' : 'Nieuw project'}</span>
            <button style={{ textAlign: 'right', fontWeight: 600 }} disabled={!valid} onClick={() => save(close)}>{editId ? 'Bewaar' : 'Voeg toe'}</button>
          </div>
          <div className="sheet-body">
            <div className="field">
              <label htmlFor="titel">Wat wil je doen?</label>
              <input id="titel" className="text-input big" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bijvoorbeeld: badkamer betegelen" autoFocus={!editId} enterKeyHint="done" />
            </div>

            <div className="section">
              <div className="section-head"><span className="section-label">Ruimte</span></div>
              <div className="chips" style={{ gap: 8 }}>
                {rooms.map((r) => (
                  <button key={r} className={`pill${room === r ? ' on' : ''}`} onClick={() => setRoom(room === r ? '' : r)}>{r}</button>
                ))}
                {addingRoom ? (
                  <form onSubmit={(e) => { e.preventDefault(); if (newRoom.trim()) { setRoom(newRoom.trim()); } setNewRoom(''); setAddingRoom(false); }}>
                    <input className="search" style={{ width: 150, padding: '7px 12px' }} autoFocus placeholder="Naam ruimte" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} onBlur={() => { if (newRoom.trim()) setRoom(newRoom.trim()); setAddingRoom(false); setNewRoom(''); }} />
                  </form>
                ) : (
                  <button className="pill add" onClick={() => setAddingRoom(true)}>+ Ruimte</button>
                )}
              </div>
            </div>

            <div className="section">
              <div className="section-head"><span className="section-label">Wacht op</span></div>
              <div className="card pad stack" style={{ gap: 12 }}>
                {deps.map((x) => {
                  const dp = data.projects[x.id];
                  if (!dp) return null;
                  return (
                    <div key={x.id} className="stack" style={{ gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--sep)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{dp.title}</span>
                        <button className="del-btn" aria-label={`${dp.title} weghalen`} onClick={() => setDeps(deps.filter((y) => y.id !== x.id))}><Icon name="close" size={18} /></button>
                      </div>
                      <div className="segmented">
                        <button className={x.kind === 'hard' ? 'on' : ''} onClick={() => setDeps(deps.map((y) => (y.id === x.id ? { ...y, kind: 'hard' } : y)))}>Moet eerst</button>
                        <button className={x.kind === 'soft' ? 'on' : ''} onClick={() => setDeps(deps.map((y) => (y.id === x.id ? { ...y, kind: 'soft' } : y)))}>Liefst eerst</button>
                      </div>
                      <span className="row-sub">{x.kind === 'hard' ? 'Dit project kan pas beginnen als dat klaar is.' : 'Alleen een tip voor de volgorde; je kunt al beginnen.'}</span>
                    </div>
                  );
                })}

                {picking ? (
                  <div className="stack fade-in" style={{ gap: 6 }}>
                    <input className="search" placeholder="Zoek een project" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {candidates.length === 0 && <div className="row-sub" style={{ padding: '10px 0' }}>Geen projecten gevonden.</div>}
                      {candidates.map((c) => (
                        <button key={c.id} className="row tappable" style={{ minHeight: 40 }} onClick={() => { setDeps([...deps, { id: c.id, kind: 'hard' }]); setPicking(false); setQuery(''); }}>
                          <span className="row-main">
                            <span style={{ fontSize: 15 }}>{c.title}</span>
                            <span className="row-sub">{[c.room, c.status === 'klaar' ? 'Klaar' : ''].filter(Boolean).join(' · ')}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <button className="link-btn" style={{ textAlign: 'left', fontSize: 15 }} onClick={() => { setPicking(false); setQuery(''); }}>Sluit</button>
                  </div>
                ) : (
                  <>
                    {Object.keys(data.projects).length > (editId ? 1 : 0) && (
                      <button className="link-btn" style={{ textAlign: 'left', fontSize: 15 }} onClick={() => setPicking(true)}>Kies een project</button>
                    )}
                    {Object.keys(data.projects).length <= (editId ? 1 : 0) && (
                      <span className="row-sub">Dit is je eerste project. Later kun je hier aangeven waarop een project wacht.</span>
                    )}
                    {suggestion && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: deps.length ? undefined : '1px solid var(--sep)', paddingTop: 10 }}>
                        <span style={{ color: 'var(--orange)' }}><Icon name="sparkle" size={18} /></span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>Voorstel: <b style={{ color: 'var(--text)' }}>{suggestion.title}</b> (zelfde ruimte)</span>
                        <button className="link-btn" style={{ fontWeight: 600 }} onClick={() => setDeps([...deps, { id: suggestion.id, kind: 'hard' }])}>Toevoegen</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {preview && (
              <div className="banner" style={{ animation: 'none' }}>
                <div className="level-badge sm"><small>STAP</small><b>{preview.step}</b></div>
                <span style={{ fontSize: 13 }}>
                  Wordt stap {preview.step} in het {preview.name ?? 'traject'}
                  {preview.blockers.length ? ` en kan beginnen zodra ${preview.blockers.join(' en ')} klaar ${preview.blockers.length === 1 ? 'is' : 'zijn'}.` : ' en kan meteen beginnen.'}
                </span>
              </div>
            )}

            <div className="section">
              <div className="section-head"><span className="section-label">Inschatting · optioneel</span></div>
              <div className="list">
                <div className="form-row">
                  <span className="label">Moeite</span>
                  <div className="mini-seg">
                    {(['S', 'M', 'L', 'XL'] as Effort[]).map((e) => (
                      <button key={e} className={effort === e ? 'on' : ''} onClick={() => setEffort(effort === e ? undefined : e)}>{e}</button>
                    ))}
                  </div>
                </div>
                <div className="form-hint">{effort ? `${effort} · ongeveer ${EFFORT_HINT[effort]}` : 'S een middag · M een weekend · L een paar weekenden · XL weken'}</div>
                <div className="form-row">
                  <span className="label">Impact</span>
                  <div className="impact-dots" role="radiogroup" aria-label="Impact">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} role="radio" aria-checked={impact === n} aria-label={`Impact ${n} van 5`} onClick={() => setImpact(impact === n ? undefined : n)}>
                        <span className={impact != null && n <= impact ? 'on' : ''} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-hint">{impact ? `${impact} van 5 · ${IMPACT_HINT[impact]}` : 'Hoeveel merk je ervan als het klaar is?'}</div>
                <div className="form-row">
                  <span className="label">Kosten</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input className="num-input" inputMode="numeric" placeholder="€ van" aria-label="Kosten vanaf" value={costMin} onChange={(e) => setCostMin(e.target.value)} />
                    <span className="row-sub">–</span>
                    <input className="num-input" inputMode="numeric" placeholder="€ tot" aria-label="Kosten tot" value={costMax} onChange={(e) => setCostMax(e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <span className="label">Wie</span>
                  <div className="mini-seg">
                    <button className={doer === 'zelf' ? 'on' : ''} onClick={() => setDoer(doer === 'zelf' ? undefined : 'zelf')}>Zelf</button>
                    <button className={doer === 'vakman' ? 'on' : ''} onClick={() => setDoer(doer === 'vakman' ? undefined : 'vakman')}>Vakman</button>
                  </div>
                </div>
              </div>
              {(parseEuro(costMin) != null || parseEuro(costMax) != null) && (
                <span className="row-sub" style={{ padding: '0 4px' }}>Schatting: {formatRange({ min: Math.min(parseEuro(costMin) ?? parseEuro(costMax)!, parseEuro(costMax) ?? parseEuro(costMin)!), max: Math.max(parseEuro(costMin) ?? 0, parseEuro(costMax) ?? 0) })}</span>
              )}
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
