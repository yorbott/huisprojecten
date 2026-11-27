import { bestScore, estimate, formatRange, type Derived } from '../logic';
import { dismissUnlock, replaceAll, useData, useDerived } from '../store';
import { sampleData } from '../sample';
import type { Project } from '../types';
import { Icon } from '../ui';
import type { Nav } from '../App';

export function ProjectCard({ p, d, nav }: { p: Project; d: Derived; nav: Nav }) {
  const est = estimate(p);
  const unlocks = d.unlocks[p.id].length;
  const traject = d.trajecten.find((t) => t.id === d.trajectOf[p.id]);
  return (
    <button className="card project-card tappable" onClick={() => nav.openProject(p.id)}>
      <div className="title-row">
        <span className="title">{p.title}</span>
        <span className="chev"><Icon name="chevronRight" size={16} stroke={2.5} /></span>
      </div>
      <div className="chips">
        {p.room && <span className="chip">{p.room}</span>}
        {traject && <span className="chip">Stap {d.depth[p.id]} van {traject.steps}</span>}
        {p.effort && <span className="chip">Moeite {p.effort}</span>}
        {est && <span className="chip">{formatRange(est)}</span>}
        {d.route.has(p.id) && <span className="chip blue">Route naar doel</span>}
        {unlocks > 0 && <span className="chip orange">Ontgrendelt {unlocks}</span>}
      </div>
    </button>
  );
}

export function LevelCard({ d }: { d: Derived }) {
  const l = d.level;
  return (
    <div className="card pad stack" style={{ gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="level-badge"><small>HUIS</small><b>{l.level}</b></div>
        <div className="row-main">
          <span style={{ fontSize: 17, fontWeight: 600 }}>Huislevel {l.level}</span>
          <span className="row-sub" style={{ fontSize: 13 }}>Nog {l.toNext} punten tot level {l.level + 1}</span>
        </div>
      </div>
      <div className="progress xp"><div style={{ width: `${Math.max(3, l.progress * 100)}%` }} /></div>
    </div>
  );
}

export function NuScreen({ nav }: { nav: Nav }) {
  const data = useData();
  const d = useDerived();
  const all = Object.values(data.projects);
  const busy = all.filter((p) => d.state[p.id] === 'bezig');
  const available = all
    .filter((p) => d.state[p.id] === 'beschikbaar')
    .sort((a, b) => bestScore(b, d, data.projects) - bestScore(a, d, data.projects));
  const unlock = data.lastUnlock;
  const unlockTitles = unlock?.ids.map((i) => data.projects[i]).filter((p) => p && p.status !== 'klaar') ?? [];
  const lastDone = all.filter((p) => p.status === 'klaar' && p.completedAt).sort((a, b) => b.completedAt! - a.completedAt!)[0];

  return (
    <div className="screen fade-in">
      <div className="navbar">
        <button className="icon-btn plain" aria-label="Instellingen" onClick={nav.openSettings}><Icon name="gear" size={19} /></button>
        <button className="icon-btn filled" aria-label="Nieuw project" onClick={() => nav.openNew()}><Icon name="plus" size={18} stroke={2.5} /></button>
      </div>
      <h1 className="large-title">Nu</h1>
      <p className="subtitle">Wat je vandaag kunt oppakken</p>

      {all.length === 0 ? (
        <div className="empty">
          <div className="level-badge"><small>HUIS</small><b>1</b></div>
          <h2>Welkom thuis</h2>
          <p>Zet hier alles neer wat je aan je huis wilt doen. Geef aan wat eerst moet, en de app zoekt zelf uit wat je nu kunt oppakken.</p>
          <button className="btn primary" style={{ marginTop: 8 }} onClick={() => nav.openNew()}>Eerste project toevoegen</button>
          <button className="btn secondary" onClick={() => replaceAll(sampleData())}>Bekijk een voorbeeldhuis</button>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 14 }}>
          <LevelCard d={d} />
          {lastDone && (
            <div className="row-sub" style={{ display: 'flex', justifyContent: 'space-between', marginTop: -6, padding: '0 4px', fontSize: 13 }}>
              <span>Laatst klaar: {lastDone.title}</span>
            </div>
          )}

          {unlock && unlockTitles.length > 0 && (
            <div className="banner">
              <span className="round"><Icon name="unlock" size={16} stroke={2.2} /></span>
              <button className="row-main" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => nav.openProject(unlockTitles[0].id)}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{unlock.fromTitle} is klaar</span>
                <span style={{ fontSize: 13 }}>
                  Nu beschikbaar: {unlockTitles.map((p) => p.title).join(' en ')}
                </span>
              </button>
              <button className="del-btn" aria-label="Melding sluiten" onClick={dismissUnlock} style={{ color: 'inherit' }}><Icon name="close" size={16} /></button>
            </div>
          )}

          {busy.length > 0 && (
            <div className="section">
              <div className="section-head"><span className="section-label">Bezig</span></div>
              {busy.map((p) => {
                const done = p.steps.filter((s) => s.done).length;
                return (
                  <button key={p.id} className="card project-card tappable" onClick={() => nav.openProject(p.id)}>
                    <div className="title-row">
                      <div className="row-main">
                        <span className="title">{p.title}</span>
                        <span className="row-sub" style={{ fontSize: 13 }}>
                          {[p.room, p.doer === 'zelf' ? 'Zelf doen' : p.doer === 'vakman' ? 'Vakman' : '', p.steps.length ? `${done} van ${p.steps.length} stappen` : ''].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <span className="chev"><Icon name="chevronRight" size={16} stroke={2.5} /></span>
                    </div>
                    {p.steps.length > 0 && <div className="progress"><div style={{ width: `${(done / p.steps.length) * 100}%` }} /></div>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="section">
            <div className="section-head">
              <span className="section-label">Beschikbaar · {available.length}</span>
              <span className="section-meta" style={{ color: 'var(--accent)' }}>Beste keuze eerst</span>
            </div>
            {available.length === 0 ? (
              <div className="card pad row-sub" style={{ fontSize: 14 }}>Niets beschikbaar. Rond eerst een lopend project af, of voeg iets nieuws toe.</div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {available.map((p) => <ProjectCard key={p.id} p={p} d={d} nav={nav} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
