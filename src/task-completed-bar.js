/**
 * Task Completed bar — a fixed strip rendered immediately above the Rose query box
 * (composer) once the current agent has finished its task.
 *
 *   [ ✓ Task Completed                         (Archive Agent) ]
 *   [ Ask Rose anything …                                   (●) ]
 *
 * Framework-agnostic: mountTaskCompletedBar(composerEl, { onArchive }) inserts the bar as the
 * composer's previous sibling, so it shares the composer's column and stays pinned with it
 * outside the scrolling transcript. Styling reads the app's theme tokens (hsl(var(--card)),
 * --border, --radius, --primary, …) so user themes apply unchanged.
 */

/** Agent statuses that mean "the agent finished its task" (compared case-insensitively). */
export const COMPLETED_STATUSES = Object.freeze(['COMPLETED', 'COMPLETE', 'DONE', 'SUCCEEDED', 'FINISHED']);

/**
 * True when the bar should be shown for this agent: its task is complete and the agent is not
 * archived. Accepts an explicit `taskCompleted` flag or a completion `status`.
 */
export function isTaskCompleted(agent) {
  if (!agent || agent.archived === true || String(agent.status || '').toUpperCase() === 'ARCHIVED') return false;
  if (agent.taskCompleted === true) return true;
  return typeof agent.status === 'string' && COMPLETED_STATUSES.includes(agent.status.toUpperCase());
}

const STYLE_ID = 'rose-task-completed-bar-style';
const CSS = `
.rose-task-completed-bar {
  box-sizing: border-box;
  width: min(760px, calc(100% - 32px));
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 8px 8px 14px;
  border-radius: calc(var(--radius, 0.75rem) + 4px);
  background: hsl(var(--card, 0 0% 100%));
  color: hsl(var(--card-foreground, 240 15% 8%));
  border: 1px solid hsl(var(--border, 240 8% 88%));
  box-shadow: 0 6px 20px -12px hsl(240 15% 8% / 0.2);
  font-size: 14px;
  line-height: 1.4;
}
.rose-task-completed-bar[hidden] { display: none; }
.rose-task-completed-bar__label {
  display: flex; align-items: center; gap: 8px; min-width: 0;
  font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rose-task-completed-bar__icon { flex: none; width: 16px; height: 16px; color: hsl(142 71% 38%); }
.rose-task-completed-bar__archive {
  flex: none;
  font: inherit; font-weight: 500;
  padding: 6px 12px;
  border-radius: calc(var(--radius, 0.75rem) - 2px);
  border: 1px solid hsl(var(--primary, 240 15% 8%));
  background: hsl(var(--primary, 240 15% 8%));
  color: hsl(var(--primary-foreground, 240 15% 98%));
  cursor: pointer;
}
.rose-task-completed-bar__archive:hover:not(:disabled) { opacity: 0.9; }
.rose-task-completed-bar__archive:focus-visible { outline: 2px solid hsl(var(--ring, 240 15% 8%)); outline-offset: 2px; }
.rose-task-completed-bar__archive:disabled { opacity: 0.6; cursor: default; }
@media (max-width: 767px) {
  .rose-task-completed-bar { width: calc(100% - 24px); font-size: 13px; }
  .rose-task-completed-bar__archive { padding: 6px 10px; }
}
`;

function ensureStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.append(style);
}

/**
 * Mounts the bar directly above `composer`. Call update(agent) whenever the agent changes;
 * the bar shows only while isTaskCompleted(agent). `onArchive(agent)` runs on click; while a
 * returned promise is pending the button is disabled, and on success the bar hides.
 */
export function mountTaskCompletedBar(composer, { onArchive } = {}) {
  const doc = composer.ownerDocument;
  ensureStyle(doc);

  const bar = doc.createElement('div');
  bar.className = 'rose-task-completed-bar';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  bar.dataset.testid = 'task-completed-bar';
  bar.hidden = true;
  bar.innerHTML = `
    <span class="rose-task-completed-bar__label">
      <svg class="rose-task-completed-bar__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 8.2l2 2 4-4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Task Completed</span>
    </span>
    <button type="button" class="rose-task-completed-bar__archive">Archive Agent</button>`;
  composer.before(bar);

  const button = bar.querySelector('button');
  let current = null;

  button.addEventListener('click', async () => {
    if (!current || button.disabled) return;
    const agent = current;
    button.disabled = true;
    button.textContent = 'Archiving…';
    try {
      await onArchive?.(agent);
      if (current === agent) update({ ...agent, archived: true });
    } catch (err) {
      console.error('[task-completed-bar] archive failed', err);
    } finally {
      button.disabled = false;
      button.textContent = 'Archive Agent';
    }
  });

  function update(agent) {
    current = agent || null;
    bar.hidden = !isTaskCompleted(current);
  }

  return {
    element: bar,
    update,
    destroy() { bar.remove(); },
  };
}
