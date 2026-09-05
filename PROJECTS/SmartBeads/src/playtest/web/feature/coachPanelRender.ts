export interface CoachPanelContent {
  intro: string;
  points: string[];
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
  const items = content.points.map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  return `
    <p class="coach-lesson-intro">${intro}</p>
    <ul class="coach-lesson-points">${items}</ul>
  `;
}
