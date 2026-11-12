# agent-d6592fb1

**Task Completed bar** for the Rose user UI: once an agent finishes its task, a fixed bar
appears directly above the query box with "Task Completed" on the left and an
"Archive Agent" button on the right.

- `src/task-completed-bar.js` — framework-agnostic module.
  - `isTaskCompleted(agent)`: true for `status` COMPLETED/COMPLETE/DONE/SUCCEEDED/FINISHED
    (any case) or `taskCompleted: true`; false when archived.
  - `mountTaskCompletedBar(composerEl, { onArchive })` inserts the bar as the composer's
    previous sibling and returns `{ element, update(agent), destroy() }`. Call `update` whenever
    the agent changes. `onArchive(agent)` runs on click (button disabled while pending; bar hides
    on success). Styling uses the app theme tokens (`--card`, `--border`, `--primary`, `--radius`…)
    and matches the composer column (`min(760px, 100% - 32px)`), with a ≤767px phone layout.
- `demo/index.html` — Rose-style conversation demo with a status switcher (`?status=COMPLETED`).
- `npm test` — unit tests plus headless-Chromium tests of the demo (visibility, placement,
  layout, archive, 375px viewport). Screenshots go to `test-artifacts/`.

## Wiring into Rose

```js
import { mountTaskCompletedBar } from './task-completed-bar.js';
const bar = mountTaskCompletedBar(document.querySelector('.composer'), {
  onArchive: (agent) => archiveAgent(agent.id), // Rose's archive action
});
onAgentChange((agent) => bar.update(agent));   // re-run on every status change
```
