import { useEffect, useState, type ReactNode } from 'react';
import type { ProjectState } from './types';

const paths: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  tree: (<><rect x="9" y="2" width="6" height="5" rx="1" /><rect x="2" y="17" width="6" height="5" rx="1" /><rect x="16" y="17" width="6" height="5" rx="1" /><path d="M12 7v5M5 17v-5h14v5" /></>),
  house: <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />,
  bulb: <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" />,
  check: <path d="M5 12l5 5 9-10" />,
  lock: (<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  unlock: (<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></>),
  chevronRight: <path d="M9 5l7 7-7 7" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronDown: <path d="M5 9l7 7 7-7" />,
  more: (<><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>),
  flag: <path d="M4 22V3M4 4h13l-2 4 2 4H4" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
};

export function Icon({ name, size = 20, stroke = 2 }: { name: keyof typeof paths | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function StateNode({ state, route }: { state: ProjectState; route?: boolean }) {
  return (
    <span className={`node ${state}${route ? ' route' : ''}`}>
      {state === 'klaar' && <Icon name="check" size={13} stroke={3} />}
      {state === 'op_slot' && <Icon name="lock" size={12} stroke={2.5} />}
      {(state === 'beschikbaar' || state === 'bezig') && <span className="dot" />}
    </span>
  );
}

export const STATE_LABEL: Record<ProjectState, string> = {
  klaar: 'Klaar',
  bezig: 'Bezig',
  beschikbaar: 'Beschikbaar',
  op_slot: 'Op slot',
};

export const STATE_CHIP: Record<ProjectState, string> = {
  klaar: 'green',
  bezig: 'orange',
  beschikbaar: 'blue',
  op_slot: 'grey',
};

/** Animatie bij het sluiten: zet `leaving`, roep na de animatie onDone aan. */
export function useClosing(onDone: () => void, ms = 240) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(t);
  }, [leaving]);
  return { leaving, close: () => setLeaving(true) };
}

export function Sheet({ children, onClose, white }: { children: (close: () => void) => ReactNode; onClose: () => void; white?: boolean }) {
  const { leaving, close } = useClosing(onClose);
  return (
    <>
      <div className={`sheet-backdrop${leaving ? ' leaving' : ''}`} onClick={close} />
      <div className={`sheet${white ? ' white' : ''}${leaving ? ' leaving' : ''}`} role="dialog" aria-modal="true">
        <div className="sheet-grabber"><span /></div>
        {children(close)}
      </div>
    </>
  );
}

export interface Action {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

export function ActionSheet({ actions, onClose }: { actions: Action[]; onClose: () => void }) {
  const { leaving, close } = useClosing(onClose, 200);
  return (
    <>
      <div className={`sheet-backdrop${leaving ? ' leaving' : ''}`} onClick={close} />
      <div className="action-sheet" style={leaving ? { animation: 'sheet-down 0.2s ease-in forwards' } : undefined}>
        <div className="action-group">
          {actions.map((a) => (
            <button key={a.label} className={a.destructive ? 'destructive' : ''} onClick={() => { close(); window.setTimeout(a.onClick, 200); }}>
              {a.label}
            </button>
          ))}
        </div>
        <div className="action-group">
          <button className="bold" onClick={close}>Annuleer</button>
        </div>
      </div>
    </>
  );
}

let toastSetter: ((s: string | undefined) => void) | undefined;
export function toast(msg: string) {
  toastSetter?.(msg);
}
export function ToastHost() {
  const [msg, setMsg] = useState<string>();
  toastSetter = setMsg;
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(undefined), 2200);
    return () => window.clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function parseEuro(s: string): number | undefined {
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  if (!clean) return undefined;
  const n = Math.round(Number(clean));
  return Number.isFinite(n) ? n : undefined;
}
