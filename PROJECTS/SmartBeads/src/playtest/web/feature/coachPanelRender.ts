export interface CoachPanelContent {
  intro: string;
  points: string[];
  emphasizeFinishCapture?: boolean;
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
  const items = content.points.map((p) => {
    const emphasis = content.emphasizeFinishCapture && p.startsWith('Finish capture')
      ? ' class="coach-point-emphasis"'
      : '';
    return `<li${emphasis}>${escapeHtml(p)}</li>`;
  }).join('');
  return `
    <p class="coach-lesson-intro">${intro}</p>
    <ul class="coach-lesson-points">${items}</ul>
  `;
}
