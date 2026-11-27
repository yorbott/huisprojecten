import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadData } from './store';
import './styles.css';

// Houd de zichtbare schermhoogte bij. Als het toetsenbord opent, krimpt de app mee
// en schuift het actieve invoerveld in beeld, net boven het toetsenbord.
const vv = window.visualViewport;
let kbTimer: number | undefined;
function syncViewport() {
  const root = document.documentElement;
  const h = vv ? vv.height : window.innerHeight;
  root.style.setProperty('--vvh', `${h}px`);
  root.style.setProperty('--vvtop', `${vv ? vv.offsetTop : 0}px`);
  const keyboard = window.innerHeight - h > 120;
  root.classList.toggle('kb', keyboard);
  if (window.scrollY) window.scrollTo(0, 0);
  if (keyboard) {
    window.clearTimeout(kbTimer);
    kbTimer = window.setTimeout(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
  }
}
syncViewport();
vv?.addEventListener('resize', syncViewport);
vv?.addEventListener('scroll', syncViewport);
window.addEventListener('resize', syncViewport);

createRoot(document.getElementById('root')!).render(<App />);
loadData();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
