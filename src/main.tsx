import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadData } from './store';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);
loadData();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
