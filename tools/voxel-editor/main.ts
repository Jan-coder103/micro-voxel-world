import { mountWorkshop } from './workshop';
import './base.css';
import './workshop.css';

const dispose = mountWorkshop();
if (import.meta.hot) import.meta.hot.dispose(dispose);
window.addEventListener('pagehide', dispose, { once: true });
