/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../../../../../../index.html'), 'utf8');

/** Audit 2026-10-03: the name boxes, AI level selects, music select and volume slider had no accessible name (a placeholder is not one). */
describe('index.html controls have accessible names', () => {
  it('every input, select, textarea and button is named by a label, aria-label, title or its own text', () => {
    const doc = new DOMParser().parseFromString(indexHtml, 'text/html');
    const unnamed = [...doc.querySelectorAll('input, select, textarea, button')]
      .filter((el) => (el as HTMLInputElement).type !== 'hidden')
      .filter((el) => !el.closest('[hidden], [aria-hidden="true"]'))
      .filter((el) => {
        const own =
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.getAttribute('title') ||
          (el.tagName === 'BUTTON' ? el.textContent : '') ||
          '';
        if (own.trim()) return false;
        const id = el.getAttribute('id');
        if (id && doc.querySelector(`label[for="${id}"]`)) return false;
        return !el.closest('label');
      })
      .map((el) => el.outerHTML.slice(0, 100));
    expect(unnamed).toEqual([]);
  });
});
