import { useState } from 'react';
import { bestScore, estimate, formatRange, type Derived } from '../logic';
import { dismissUnlock, replaceAll, useData, useDerived } from '../store';
import { sampleData } from '../sample';
import type { Project } from '../types';
import { Icon } from '../ui';
import type { Nav } from '../App';

/** Eén rustige kaart: titel, één regel uitleg, hooguit één label. */
export function ProjectCard({ p, d, nav, nextOnRoute }: { p: Project; d: Derived; nav: Nav; nextOnRoute?: boolean }) {
  const est = estimate(p);
  const unlocks = d.unlocks[p.id].length;
  const sub = [p.room, formatRange(est)].filter(Boolean).join(' · ');
  return (
    <button className="card project-card tappable" onClick={() => nav.openProject(p.id)}>
      <div className="title-row">
        <span className="row-main">
          <span className="title">{p.title}</span>
          {sub && <span className="row-sub" style={{ fontSize: 13 }}>{sub}</span>}
        </span>
        <span className="chev"><Icon name="chevronRight" size={16} stroke={2.5} /></span>
      </div>
      {nextOnRoute ? (
        <span className="hint blue"><Icon name="flag" size={13} stroke={2.4} />Volgende stap naar je doel</span>
      ) : unlocks > 0 ? (
        <span className="hint orange"><Icon name="unlock" size={13} stroke={2.4} />Maakt {unlocks} {unlocks === 1 ? 'project' : 'projecten'} vrij</span>
      ) : null}
    </button>
  );
}

export function LevelCard({ d }: { d: Derived }) {
  const l = d.level;
  return (
    <div className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div className="level-badge sm"><small>HUIS</small><b>{l.level}</b></div>
      <div className="row-main" style={{ gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Huislevel {l.level}</span>
          <span className="row-sub">nog {l.toNext} pt</span>
        </div>
        <div className="progress xp"><div style={{ width: `${Math.max(3, l.progress * 100)}%` }} /></div>
      </div>
    </div>
  );
}

export function NuScreen({ nav }: { nav: Nav }) {
  const data = useData();
  const d = useDerived();
  const [showAll, setShowAll] = useState(false);
  const all = Object.values(data.projects);
  const busy = all.filter((p) => d.state[p.id] === 'bezig');
  const available = all
    .filter((p) => d.state[p.id] === 'beschikbaar')
    .sort((a, b) => bestScore(b, d, data.projects) - bestScore(a, d, data.projects));
  const top = showAll ? available : available.slice(0, 3);
  const nextRouteId = d.routeSteps.find((i) => d.state[i] === 'beschikbaar' || d.state[i] === 'bezig');
  const unlock = data.lastUnlock;
  const unlockTitles = unlock?.ids.map((i) => data.projects[i]).filter((p) => p && p.status !== 'klaar') ?? [];

  return (
    <div className="screen fade-in">
      <div className="navbar">
        <button className="icon-btn plain" aria-label="Instellingen" onClick={nav.openSettings}><Icon name="gear" size={19} /></button>
        <button className="icon-btn filled" aria-label="Nieuw project" onClick={() => nav.openNew()}><Icon name="plus" size={18} stroke={2.5} /></button>
      </div>
      <h1 className="large-title">Nu</h1>

      {all.length === 0 ? (
        <div className="empty">
          <div className="level-badge"><small>HUIS</small><b>1</b></div>
          <h2>Welkom thuis</h2>
          <p>Zet hier alles neer wat je aan je huis wilt doen. Geef aan wat eerst moet, en de app zoekt zelf uit wat je nu kunt oppakken.</p>
          <button className="btn primary" style={{ marginTop: 8 }} onClick={() => nav.openNew()}>Eerste project toevoegen</button>
          <button className="btn secondary" onClick={() => replaceAll(sampleData())}>Bekijk een voorbeeldhuis</button>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 14, gap: 22 }}>
          <LevelCard d={d} />

          {unlock && unlockTitles.length > 0 && (
            <div className="banner">
              <span className="round"><Icon name="unlock" size={16} stroke={2.2} /></span>
              <button className="row-main" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => nav.openProject(unlockTitles[0].id)}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Nieuw beschikbaar</span>
                <span style={{ fontSize: 13 }}>{unlockTitles.map((p) => p.title).join(' en ')}</span>
              </button>
              <button className="del-btn" aria-label="Melding sluiten" onClick={dismissUnlock} style={{ color: 'inherit' }}><Icon name="close" size={16} /></button>
            </div>
          )}

          {busy.length > 0 && (
            <div className="section">
              <div className="section-head"><span className="section-label">Mee bezig</span></div>
              <div className="stack" style={{ gap: 10 }}>
                {busy.map((p) => {
                  const done = p.steps.filter((s) => s.done).length;
                  return (
                    <button key={p.id} className="card project-card tappable" onClick={() => nav.openProject(p.id)}>
                      <div className="title-row">
                        <span className="row-main">
                          <span className="title">{p.title}</span>
                          <span className="row-sub" style={{ fontSize: 13 }}>
                            {p.steps.length ? `${done} van ${p.steps.length} stappen gedaan` : p.room}
                          </span>
                        </span>
                        <span className="chev"><Icon name="chevronRight" size={16} stroke={2.5} /></span>
                      </div>
                      {p.steps.length > 0 && <div className="progress"><div style={{ width: `${(done / p.steps.length) * 100}%` }} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="section">
            <div className="section-head">
              <span className="section-label">{busy.length ? 'Hierna' : 'Pak dit op'}</span>
            </div>
            {available.length === 0 ? (
              <div className="card pad row-sub" style={{ fontSize: 14 }}>Niets beschikbaar. Rond eerst een lopend project af, of voeg iets nieuws toe.</div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {top.map((p) => <ProjectCard key={p.id} p={p} d={d} nav={nav} nextOnRoute={p.id === nextRouteId} />)}
                {available.length > 3 && (
                  <button className="link-btn" style={{ fontSize: 15, padding: '4px 4px' , textAlign: 'left' }} onClick={() => setShowAll(!showAll)}>
                    {showAll ? 'Toon minder' : `Toon alle ${available.length} beschikbare projecten`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
