import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadData } from './store';
import './styles.css';

// Houd de zichtbare schermhoogte bij (krimpt als het toetsenbord opent) en voorkom dat iOS de pagina verschuift.
const vv = window.visualViewport;
function syncViewport() {
  const root = document.documentElement;
  root.style.setProperty('--vvh', `${vv ? vv.height : window.innerHeight}px`);
  root.style.setProperty('--vvtop', `${vv ? vv.offsetTop : 0}px`);
  if (window.scrollY) window.scrollTo(0, 0);
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
