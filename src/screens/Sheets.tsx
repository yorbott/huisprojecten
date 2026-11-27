import { useRef, useState } from 'react';
import { estimate, formatEuro, formatRange } from '../logic';
import { emptyData, exportJson, importJson, replaceAll, updateProject, useData, useDerived, type CompletionResult } from '../store';
import { sampleData } from '../sample';
import { Icon, parseEuro, Sheet, toast } from '../ui';
import type { Nav } from '../App';

export function CompletionSheet({ id, result, nav, onClose }: { id: string; result: CompletionResult; nav: Nav; onClose: () => void }) {
  const data = useData();
  const d = useDerived();
  const p = data.projects[id];
  const [cost, setCost] = useState(p?.actualCost != null ? formatEuro(p.actualCost) : '');
  if (!p) return null;
  const est = estimate(p);
  const traject = d.trajecten.find((t) => t.id === d.trajectOf[id]);
  const after = d.level;
  const levelUp = result.levelAfter > result.levelBefore;
  const parsed = parseEuro(cost);

  const finish = (close: () => void) => {
    updateProject(id, { actualCost: parsed });
    close();
  };

  return (
    <Sheet white onClose={onClose}>
      {(close) => (
        <div className="sheet-body" style={{ paddingTop: 20 }}>
          <div className="celebrate">
            <div className="big-check"><Icon name="check" size={38} stroke={3} /></div>
            <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: -0.3 }}>{p.title} is klaar</h1>
            {traject && <span className="row-sub" style={{ fontSize: 15 }}>{traject.name} · stap {d.depth[id]} van {traject.steps} gedaan</span>}
          </div>

          <div className="points-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="big">+{result.points} punten</span>
              <span style={{ fontSize: 13 }}>Moeite {p.effort ?? 'M'} · impact {p.impact ?? 3}/5</span>
            </div>
            <div className="progress xp" style={{ background: 'color-mix(in srgb, var(--orange) 20%, transparent)' }}>
              <div style={{ width: `${Math.max(3, after.progress * 100)}%` }} />
            </div>
            {levelUp ? (
              <span className="level-up">Huislevel {after.level} bereikt!</span>
            ) : (
              <span style={{ fontSize: 13 }}>Huislevel {after.level} · nog {after.toNext} punten tot level {after.level + 1}</span>
            )}
          </div>

          <div className="section">
            <div className="section-head"><span className="section-label">Wat heeft het gekost?</span></div>
            <div className="card" style={{ background: 'var(--card-2)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <label htmlFor="kosten" style={{ flex: 1, fontSize: 16 }}>Werkelijke kosten</label>
              <input id="kosten" className="num-input" style={{ background: 'var(--card)', width: 120 }} inputMode="numeric" placeholder="€ 0" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            {est && parsed != null && (
              <span className="row-sub" style={{ padding: '0 4px', color: parsed <= est.max ? 'var(--green-text)' : 'var(--orange-text)' }}>
                {parsed <= est.max ? `Binnen je schatting van ${formatRange(est)}` : `${formatEuro(parsed - est.max)} boven je schatting van ${formatRange(est)}`}
              </span>
            )}
          </div>

          {result.unlocked.length > 0 && (
            <div className="section">
              <div className="section-head"><span className="section-label">Nu beschikbaar</span></div>
              <div className="list" style={{ background: 'var(--card-2)' }}>
                {result.unlocked.map((u) => {
                  const up = data.projects[u];
                  if (!up) return null;
                  const onRoute = d.route.has(u);
                  return (
                    <button key={u} className="row tappable" onClick={() => { finish(close); window.setTimeout(() => nav.openProject(u), 260); }}>
                      <span className={`node beschikbaar${onRoute ? ' route' : ''}`}><span className="dot" /></span>
                      <span className="row-main">
                        <span className="row-title">{up.title}</span>
                        <span className="row-sub">{data.goalId === u ? 'Dit is je doel!' : onRoute ? 'Op de route naar je doel' : [up.effort ? `Moeite ${up.effort}` : '', formatRange(estimate(up))].filter(Boolean).join(' · ')}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button className="btn primary" onClick={() => finish(close)}>Klaar</button>
        </div>
      )}
    </Sheet>
  );
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const count = Object.keys(data.projects).length;

  const doExport = async () => {
    const json = exportJson();
    const name = `huisprojecten-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], name, { type: 'application/json' });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Huisprojecten back-up' });
        return;
      } catch {
        /* geannuleerd */
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <div className="sheet-header">
            <span />
            <span className="title">Instellingen</span>
            <button style={{ textAlign: 'right', fontWeight: 600 }} onClick={close}>Gereed</button>
          </div>
          <div className="sheet-body">
            <div className="section">
              <div className="section-head"><span className="section-label">Back-up</span></div>
              <div className="list">
                <button className="row tappable" onClick={doExport}>
                  <span className="row-main"><span style={{ fontSize: 16, color: 'var(--accent)' }}>Back-up exporteren</span><span className="row-sub">{count} projecten als bestand bewaren</span></span>
                </button>
                <button className="row tappable" onClick={() => fileRef.current?.click()}>
                  <span className="row-main"><span style={{ fontSize: 16, color: 'var(--accent)' }}>Back-up terugzetten</span><span className="row-sub">Vervangt alles wat nu in de app staat</span></span>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const ok = importJson(await f.text());
                  toast(ok ? 'Back-up teruggezet' : 'Dit bestand kan ik niet lezen');
                  e.target.value = '';
                }} />
              <span className="row-sub" style={{ padding: '0 4px' }}>Alles staat nu alleen op deze telefoon. Samen synchroniseren komt in een volgende versie; maak tot die tijd af en toe een back-up.</span>
            </div>

            <div className="section">
              <div className="section-head"><span className="section-label">Uitproberen</span></div>
              <div className="list">
                <button className="row tappable" onClick={() => { replaceAll(sampleData()); toast('Voorbeeldhuis geladen'); close(); }}>
                  <span className="row-main"><span style={{ fontSize: 16, color: 'var(--accent)' }}>Voorbeeldhuis laden</span><span className="row-sub">Vervangt je huidige projecten</span></span>
                </button>
                <button className="row tappable" onClick={() => {
                  if (!confirmWipe) { setConfirmWipe(true); return; }
                  replaceAll(emptyData()); toast('Alles gewist'); close();
                }}>
                  <span className="row-main"><span style={{ fontSize: 16, color: 'var(--red)' }}>{confirmWipe ? 'Tik nogmaals om alles te wissen' : 'Alles wissen'}</span></span>
                </button>
              </div>
            </div>

            <p className="row-sub" style={{ textAlign: 'center', fontSize: 12 }}>Huisprojecten · versie 0.1</p>
          </div>
        </>
      )}
    </Sheet>
  );
}
