import { hero } from './ej/hero.js';
import { boutique, compass, mood } from './ej/sections.js';

const boot = () => {
  hero();
  boutique();
  compass();
  mood();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
