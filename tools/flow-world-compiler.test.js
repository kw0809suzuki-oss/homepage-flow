'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  compileFlowWorldState,
  gitBlobSha
} = require('./flow-world-compiler.js');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-world-compiler-'));
  fs.mkdirSync(path.join(root, 'reference'), { recursive: true });
  fs.mkdirSync(path.join(root, 'schemas'), { recursive: true });

  fs.writeFileSync(path.join(root, 'ai-entry.txt'), `FLOW WORLD / AI ENTRY v0

PURPOSE
Public orientation.

EXPLORATION AND REPORTING
- The current request sets the goal. Tools are options.

PARENT PURPOSE BOUNDARY
- Return local results to the parent purpose.

RELATIONSHIP BOUNDARY
- FlowMemory is optional private continuity.

RE-ENTRY ROUTES
- Public route: use public state and tools.
- Personal route: use an authorized private source only when it exists.

AUTHORIZED CONNECTIONS / 実物への辿り方
- GitHub: read only what the task needs.
- FlowMemory: optional and authorized only.

PORTABLE SHAPES
- schemas/reentry.schema.json

TOOL RULE
Keep tools reproducible.

BOUNDARY
Do not pretend unavailable browser state exists.
`);

  fs.writeFileSync(path.join(root, 'ai-state.json'), JSON.stringify({
    world: 'Flow World',
    updated_at: '2026-10-08',
    purpose: 'Compact public re-entry.',
    current_position: { status: 'test' },
    confirmed: ['confirmed-a'],
    unknowns: ['unknown-a'],
    available_tools: [
      { id: 'tool-a', type: 'local_utility', boundary: 'no cause' },
      { id: 'tool-b', type: 'observer', boundary: 'candidate only' }
    ],
    boundaries: ['Unknown stays unknown.']
  }, null, 2));

  fs.writeFileSync(path.join(root, 'ai-tools.json'), JSON.stringify({
    updated_at: '2026-10-08',
    tools: [
      { id: 'tool-a', version: 'v0', status: 'available', implementation: 'tool-a.js', human_ui: '#a' }
    ],
    shapes: [],
    compatibility_policy: { baseline: 'read-only' }
  }, null, 2));

  fs.writeFileSync(
    path.join(root, 'reference', 'flow-memory-relationship.txt'),
    'Flow World is public; FlowMemory is optional private continuity.\n'
  );

  fs.writeFileSync(path.join(root, 'schemas', 'reentry.schema.json'), JSON.stringify({
    $id: 'reentry.schema.test',
    type: 'object'
  }, null, 2));

  return root;
}

test('projects public sources without promoting the compiled view to authority', () => {
  const root = fixture();
  const result = compileFlowWorldState(root);

  assert.equal(result.schema, 'flow-world-state/v0.1');
  assert.equal(result.IDENTITY.authority, false);
  assert.equal(result.IDENTITY.private_continuity.assumed, false);
  assert.equal(result.PRIVATE_CONTINUITY.public_core_requires_private_store, false);
  assert.deepEqual(result.POSITION.current_position, { status: 'test' });
  assert.deepEqual(result.POSITION.unknowns, ['unknown-a']);
  assert.equal(result.ROUTES.public_route, 'Public route: use public state and tools.');
  assert.equal(result.TOOLS.machine_definitions[0].id, 'tool-a');
});

test('surfaces coverage differences without treating them as resolved semantic conflict', () => {
  const root = fixture();
  const result = compileFlowWorldState(root);

  assert.equal(result.CONFLICTS.detected, true);
  assert.equal(result.CONFLICTS.semantic_conflict, 'unverified');
  assert.equal(result.CONFLICTS.resolution, null);
  assert.deepEqual(
    result.VISIBILITY.machine_definition_coverage.state_tool_ids_without_ai_tools_definition,
    ['tool-b']
  );
});

test('source fingerprints use git blob sha and all named sources remain visible', () => {
  const root = fixture();
  const result = compileFlowWorldState(root);

  assert.equal(result.SOURCES.length, 5);
  assert.ok(result.SOURCES.every(source => /^[0-9a-f]{40}$/.test(source.git_blob_sha)));

  const stateText = fs.readFileSync(path.join(root, 'ai-state.json'), 'utf8');
  const stateSource = result.SOURCES.find(source => source.path === 'ai-state.json');
  assert.equal(stateSource.git_blob_sha, gitBlobSha(stateText));
});

test('missing canonical source fails instead of silently filling the gap', () => {
  const root = fixture();
  fs.unlinkSync(path.join(root, 'ai-tools.json'));
  assert.throws(
    () => compileFlowWorldState(root),
    /Missing canonical source: ai-tools\.json/
  );
});
