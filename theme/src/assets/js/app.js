/**
 * Loaded on every page (master.twig). Page-specific code lives in home.js, product.js and cart.js,
 * mirroring Raed's entry points so the files drop into a Salla theme as they are.
 */
import * as cartUI from './ej/cart-ui.js';
import * as chrome from './ej/chrome.js';
import * as motion from './ej/motion.js';

chrome.intro();
cartUI.init();

const boot = () => {
  motion.smoothScroll();
  chrome.header();
  chrome.menu();
  chrome.search();
  chrome.newsletter();
  motion.reveals();
  motion.parallax();
  motion.tilt();
  motion.magnetic();
  motion.cursor();
  motion.dragRails();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

/* Salla's web components (comments, sliders) render late: give their content the same motion. */
new MutationObserver(() => {
  clearTimeout(window.__ejLate);
  window.__ejLate = setTimeout(() => { motion.reveals(); motion.tilt(); motion.dragRails(); }, 120);
}).observe(document.body, { childList: true, subtree: true });
