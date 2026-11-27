import { useEffect, useRef, useState } from 'react';
import { EFFORT_POINTS, estimate, formatEuro, formatRange, levelFor, levelThreshold, pointsFor, type LevelInfo } from '../logic';
import { emptyData, exportJson, importJson, reopenProject, replaceAll, updateProject, useData, useDerived, type CompletionResult } from '../store';
import { sampleData } from '../sample';
import { EFFORT_HINT, formatDate, Icon, parseEuro, Sheet, toast } from '../ui';
import type { Nav } from '../App';

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Punten tellen op, de balk loopt vol en bij een nieuw level springt de badge. */
function PointsCelebration({ points, before, after }: { points: number; before: LevelInfo; after: LevelInfo }) {
  const levelUp = after.level > before.level;
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + 450; // eerst het vinkje laten landen
    const dur = levelUp ? 1600 : 1100;
    const tick = (now: number) => {
      const v = Math.min(1, Math.max(0, (now - start) / dur));
      setT(v);
      if (v < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const e = ease(t);
  const shown = Math.round(points * e);
  let width: number;
  let level: number;
  if (levelUp) {
    // eerst vol tot het oude level af is, dan opnieuw vullen in het nieuwe level
    if (t < 0.55) { width = before.progress + (1 - before.progress) * ease(t / 0.55); level = before.level; }
    else { width = after.progress * ease((t - 0.55) / 0.45); level = after.level; }
  } else {
    width = before.progress + (after.progress - before.progress) * e;
    level = after.level;
  }
  const done = t >= 1;
  const bumped = levelUp && t >= 0.55;

  return (
    <div className="points-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className={`level-badge sm${bumped ? ' bump' : ''}`} key={level}><small>HUIS</small><b>{level}</b></div>
        <div className="row-main" style={{ gap: 2 }}>
          <span className={`big${done ? ' landed' : ''}`}>+{shown} punten</span>
          <span style={{ fontSize: 13 }}>
            {bumped ? `Huislevel ${after.level} bereikt!` : done ? `Huislevel ${after.level} · nog ${after.toNext} punten tot level ${after.level + 1}` : `Huislevel ${level}`}
          </span>
        </div>
      </div>
      <div className="progress xp" style={{ background: 'color-mix(in srgb, var(--orange) 20%, transparent)' }}>
        <div style={{ width: `${Math.max(3, width * 100)}%`, transition: 'none' }} />
      </div>
      {done && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: levelUp ? 36 : 18 }, (_, i) => {
            const angle = (i / (levelUp ? 36 : 18)) * Math.PI * 2;
            const dist = 70 + ((i * 37) % 60);
            const colors = ['#ffb547', '#f07a1a', '#0a5fc9', '#1e8e3e', '#8e44ad'];
            return <span key={i} style={{ ['--dx' as string]: `${Math.cos(angle) * dist}px`, ['--dy' as string]: `${Math.sin(angle) * dist - 30}px`, ['--r' as string]: `${(i * 47) % 360}deg`, background: colors[i % colors.length], animationDelay: `${(i % 6) * 15}ms` }} />;
          })}
        </div>
      )}
    </div>
  );
}

export function CompletionSheet({ id, result, nav, onClose }: { id: string; result: CompletionResult; nav: Nav; onClose: () => void }) {
  const data = useData();
  const d = useDerived();
  const p = data.projects[id];
  const [cost, setCost] = useState(p?.actualCost != null ? formatEuro(p.actualCost) : '');
  if (!p) return null;
  const est = estimate(p);
  const traject = d.trajecten.find((t) => t.id === d.trajectOf[id]);
  const after = d.level;
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
            {traject && <span className="row-sub" style={{ fontSize: 15 }}>{traject.name} · stap {d.depth[id]} van {traject.steps} afgerond</span>}
          </div>

          <PointsCelebration points={result.points} before={levelFor(after.points - result.points)} after={after} />

          <div className="section">
            <div className="section-head"><span className="section-label">Wat heeft het gekost?</span></div>
            <div className="card" style={{ background: 'var(--card-2)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <label htmlFor="kosten" style={{ flex: 1, fontSize: 16 }}>Werkelijke kosten</label>
              <input id="kosten" className="num-input" style={{ background: 'var(--card)', width: 120 }} inputMode="numeric" placeholder="Optioneel" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            {est && parsed != null && (
              <span className="row-sub" style={{ padding: '0 4px', color: parsed <= est.max ? 'var(--green-text)' : 'var(--orange-text)' }}>
                {parsed <= est.max ? `Binnen je schatting van ${formatRange(est)}` : `${formatEuro(parsed - est.max)} boven je schatting van ${formatRange(est)}`}
              </span>
            )}
          </div>

          {result.unlocked.length > 0 && (
            <div className="section">
              <div className="section-head"><span className="section-label">Je kunt nu beginnen aan</span></div>
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
                        <span className="row-sub">{data.goalId === u ? 'Dit is je doel!' : onRoute ? 'Op weg naar je doel' : [up.effort ? `Moeite ${up.effort}` : '', formatRange(estimate(up))].filter(Boolean).join(' · ')}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button className="btn primary" onClick={() => finish(close)}>Klaar</button>
          <button className="link-btn" style={{ fontSize: 15, padding: '4px 0 10px' }} onClick={() => { reopenProject(id); close(); }}>Toch nog niet klaar</button>
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

/** Uitleg bij het huis-level: hoe punten werken en wat je laatst verdiende. */
export function LevelSheet({ onClose }: { onClose: () => void }) {
  const data = useData();
  const d = useDerived();
  const l = d.level;
  const recent = Object.values(data.projects)
    .filter((p) => p.status === 'klaar')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, 5);
  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <div className="sheet-header">
            <span />
            <span className="title">Huislevel</span>
            <button style={{ textAlign: 'right', fontWeight: 600 }} onClick={close}>Gereed</button>
          </div>
          <div className="sheet-body">
            <div className="card pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <div className="level-badge"><small>HUIS</small><b>{l.level}</b></div>
              <span style={{ fontSize: 20, fontWeight: 700 }}>Huislevel {l.level}</span>
              <div className="progress xp" style={{ width: '100%' }}><div style={{ width: `${Math.max(3, l.progress * 100)}%` }} /></div>
              <span className="row-sub" style={{ fontSize: 14 }}>{l.points} punten · nog {l.toNext} tot level {l.level + 1}</span>
            </div>

            <div className="section">
              <div className="section-head"><span className="section-label">Zo verdien je punten</span></div>
              <div className="list">
                {(['S', 'M', 'L', 'XL'] as const).map((e) => (
                  <div className="form-row" key={e}>
                    <span className="label">{e} <span className="row-sub" style={{ fontSize: 14 }}>· {EFFORT_HINT[e]}</span></span>
                    <span style={{ fontWeight: 600 }}>{EFFORT_POINTS[e]} pt</span>
                  </div>
                ))}
              </div>
              <span className="row-sub" style={{ padding: '0 4px', fontSize: 13, lineHeight: 1.4 }}>
                Elk afgerond project telt mee. Hoe meer je merkt van een klus (impact), hoe meer punten: van 80% bij 1 bolletje tot 120% bij 5.
              </span>
            </div>

            {recent.length > 0 && (
              <div className="section">
                <div className="section-head"><span className="section-label">Laatst verdiend</span></div>
                <div className="list">
                  {recent.map((p) => (
                    <div className="form-row" key={p.id}>
                      <span className="row-main">
                        <span style={{ fontSize: 15 }}>{p.title}</span>
                        {p.completedAt && <span className="row-sub">{formatDate(p.completedAt)}</span>}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--orange-text)' }}>+{pointsFor(p)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="section">
              <div className="section-head"><span className="section-label">Volgende levels</span></div>
              <div className="list">
                {[1, 2, 3].map((k) => (
                  <div className="form-row" key={k}>
                    <span className="label">Level {l.level + k}</span>
                    <span className="row-sub" style={{ fontSize: 15 }}>bij {levelThreshold(l.level + k)} punten</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
