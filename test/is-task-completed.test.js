import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTaskCompleted } from '../src/task-completed-bar.js';

test('completed statuses show the bar (case-insensitive)', () => {
  for (const status of ['COMPLETED', 'completed', 'Done', 'SUCCEEDED', 'FINISHED', 'COMPLETE']) {
    assert.equal(isTaskCompleted({ status }), true, status);
  }
});

test('an explicit taskCompleted flag shows the bar', () => {
  assert.equal(isTaskCompleted({ status: 'ACTIVE', taskCompleted: true }), true);
});

test('running, missing or archived agents hide the bar', () => {
  for (const agent of [null, undefined, {}, { status: 'ACTIVE' }, { status: 'RUNNING' }, { status: 'FAILED' },
    { status: 'ARCHIVED' }, { status: 'COMPLETED', archived: true }, { taskCompleted: true, archived: true }]) {
    assert.equal(isTaskCompleted(agent), false, JSON.stringify(agent));
  }
});
