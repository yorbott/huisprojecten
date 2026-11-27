import { useState } from 'react';
import { completeProject, useLoaded, type CompletionResult } from './store';
import { Icon, ToastHost } from './ui';
import { NuScreen } from './screens/Nu';
import { IdeeenScreen, PlanScreen, RuimtesScreen } from './screens/Plan';
import { DetailScreen } from './screens/Detail';
import { ProjectSheet, type SheetPrefill } from './screens/ProjectSheet';
import { CompletionSheet, SettingsSheet } from './screens/Sheets';

type Tab = 'nu' | 'plan' | 'ruimtes' | 'ideeen';

export interface Nav {
  openProject: (id: string) => void;
  openNew: (prefill?: SheetPrefill) => void;
  openEdit: (id: string) => void;
  complete: (id: string) => void;
  openSettings: () => void;
}

type SheetState =
  | { kind: 'new'; prefill?: SheetPrefill }
  | { kind: 'edit'; id: string }
  | { kind: 'done'; id: string; result: CompletionResult }
  | { kind: 'settings' };

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'nu', label: 'Nu', icon: 'bolt' },
  { id: 'plan', label: 'Plan', icon: 'tree' },
  { id: 'ruimtes', label: 'Ruimtes', icon: 'house' },
  { id: 'ideeen', label: 'Ideeën', icon: 'bulb' },
];

export function App() {
  const loaded = useLoaded();
  const [tab, setTab] = useState<Tab>('nu');
  const [stack, setStack] = useState<string[]>([]);
  const [sheet, setSheet] = useState<SheetState>();

  const nav: Nav = {
    openProject: (id) => setStack((s) => (s[s.length - 1] === id ? s : [...s, id])),
    openNew: (prefill) => setSheet({ kind: 'new', prefill }),
    openEdit: (id) => setSheet({ kind: 'edit', id }),
    complete: (id) => setSheet({ kind: 'done', id, result: completeProject(id) }),
    openSettings: () => setSheet({ kind: 'settings' }),
  };

  if (!loaded) return <div className="app" />;

  const top = stack[stack.length - 1];

  return (
    <div className="app">
      {tab === 'nu' && <NuScreen nav={nav} />}
      {tab === 'plan' && <PlanScreen nav={nav} />}
      {tab === 'ruimtes' && <RuimtesScreen nav={nav} />}
      {tab === 'ideeen' && <IdeeenScreen />}

      {stack.map((id, i) => (
        <DetailScreen key={`${i}-${id}`} id={id} nav={nav} depth={i} onBack={() => setStack((s) => s.slice(0, i))} />
      ))}

      {!top && (
        <nav className="tabbar" aria-label="Hoofdmenu">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={26} />
              {t.label}
            </button>
          ))}
        </nav>
      )}

      {sheet?.kind === 'new' && <ProjectSheet prefill={sheet.prefill} onClose={() => setSheet(undefined)} onCreated={(id) => nav.openProject(id)} />}
      {sheet?.kind === 'edit' && <ProjectSheet editId={sheet.id} onClose={() => setSheet(undefined)} />}
      {sheet?.kind === 'done' && <CompletionSheet id={sheet.id} result={sheet.result} nav={nav} onClose={() => setSheet(undefined)} />}
      {sheet?.kind === 'settings' && <SettingsSheet onClose={() => setSheet(undefined)} />}

      <ToastHost />
    </div>
  );
}
