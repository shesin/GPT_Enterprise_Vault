import { bootstrapPlayShell } from './PlayController';

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrapPlayShell();
} else {
  window.addEventListener('DOMContentLoaded', bootstrapPlayShell);
}
