export interface CoachPanelContent {
  intro: string;
  points: string[];
  /** Index of the lesson bullet to highlight for the current video segment. */
  emphasizedPointIndex?: number | null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderCoachPanelHtml(content: CoachPanelContent): string {
  const intro = escapeHtml(content.intro);
  const items = content.points.map((p, index) => {
    const emphasis = content.emphasizedPointIndex === index
      ? ' class="coach-point-emphasis"'
      : '';
    return `<li${emphasis}>${escapeHtml(p)}</li>`;
  }).join('');
  return `
    <p class="coach-lesson-intro">${intro}</p>
    <ul class="coach-lesson-points">${items}</ul>
  `;
}
