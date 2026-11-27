import { useState } from 'react';
import { addIdea, removeIdea, useData } from '../store';
import { formatDate, Icon, SwipeRow, toast } from '../ui';
import type { Nav } from '../App';

export function IdeeenScreen({ nav }: { nav: Nav }) {
  const data = useData();
  const [text, setText] = useState('');

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    addIdea(t);
    setText('');
  };

  return (
    <div className="screen fade-in">
      <div className="navbar"><span /></div>
      <h1 className="large-title">Ideeën</h1>
      <p className="subtitle">Snel vastleggen, later uitwerken</p>

      <form className="idea-input" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input className="text-input" placeholder="Nieuw idee…" value={text} onChange={(e) => setText(e.target.value)} enterKeyHint="done" aria-label="Nieuw idee" />
        <button type="submit" className="icon-btn filled" aria-label="Idee bewaren" disabled={!text.trim()} style={{ opacity: text.trim() ? 1 : 0.35 }}>
          <Icon name="plus" size={18} stroke={2.5} />
        </button>
      </form>

      {data.ideas.length === 0 ? (
        <div className="empty" style={{ paddingTop: 30 }}>
          <span style={{ color: 'var(--accent)' }}><Icon name="bulb" size={36} stroke={1.6} /></span>
          <p>Zie je iets bij iemand thuis, of schiet je iets te binnen? Zet het hier neer. Als je er werk van wilt maken, tik je erop en maak je er een project van.</p>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 16, gap: 8 }}>
          <div className="list" style={{ padding: 0, overflow: 'hidden' }}>
            {data.ideas.map((i) => (
              <SwipeRow key={i.id} actions={[{ label: 'Weg', onClick: () => { removeIdea(i.id); toast('Idee verwijderd'); } }]}>
                <button className="idea-row tappable" onClick={() => nav.openNew({ title: i.text, ideaId: i.id })}>
                  <span className="row-main">
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{i.text}</span>
                    <span className="row-sub">{formatDate(i.createdAt)}</span>
                  </span>
                  <span className="idea-make">Maak project</span>
                </button>
              </SwipeRow>
            ))}
          </div>
          <p className="row-sub" style={{ textAlign: 'center', fontSize: 12, margin: 0 }}>Veeg naar links om een idee weg te gooien</p>
        </div>
      )}
    </div>
  );
}
