import { buybar, gallery, notes, quantity } from './ej/product-page.js';
import { reveals } from './ej/motion.js';

const boot = () => {
  notes();
  gallery();
  quantity();
  buybar();
  reveals();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
