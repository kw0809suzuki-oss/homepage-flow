'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  START_HERE,
  compileFlowWorldState,
  gitBlobSha
} = require('./flow-world-compiler.js');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-world-compiler-'));
  fs.mkdirSync(path.join(root, 'reference'), { recursive: true });
  fs.mkdirSync(path.join(root, 'schemas'), { recursive: true });

  fs.writeFileSync(path.join(root, 'ai-entry.txt'), `FLOW WORLD / AI ENTRY v0

NORMAL ENTRY
Start with FLOW_WORLD_STATE.json.

PURPOSE
Public orientation.

EXPLORATION AND REPORTING
- The current request sets the goal. Tools are options.

ROUTE
Current request -> result.

PARENT PURPOSE BOUNDARY
- A local question may update the route without becoming the parent purpose.

RELATIONSHIP BOUNDARY
- FlowMemory is optional private continuity.

RE-ENTRY ROUTES
- Public route: use public state and tools.
- Personal route: use an authorized private source only when it exists.
- Never assume a particular private store exists.

BOUNDARY
Do not pretend unavailable browser state exists.
`);

  fs.writeFileSync(path.join(root, 'ai-state.json'), JSON.stringify({
    world: 'Flow World',
    updated_at: '2026-10-08',
    current_position: {
      status: 'test status',
      summary: 'test summary',
      working_coordinate: 'test coordinate'
    },
    available_tools: [
      { id: 'tool-a', type: 'local_utility', location: '#a' },
      { id: 'tool-b', type: 'observer', location: '#b' }
    ],
    boundaries: [
      'Generated ideas are not evidence.',
      'Unknowns remain unknown until evidence changes them.',
      'A local improvement is not completion of Flow World.',
      'Flow World must not assume that FlowMemory or any other private continuity store exists for every visitor.'
    ]
  }, null, 2));

  fs.writeFileSync(path.join(root, 'ai-tools.json'), JSON.stringify({
    updated_at: '2026-10-08',
    tools: [
      { id: 'tool-a', version: 'v0', status: 'available' }
    ]
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

test('projects a thin non-authoritative public first view', () => {
  const root = fixture();
  const result = compileFlowWorldState(root);

  assert.equal(result.schema, 'flow-world-state/v0.2');
  assert.equal(result.IDENTITY.authority, false);
  assert.equal(result.IDENTITY.private_continuity_assumed, false);
  assert.deepEqual(result.START_HERE, START_HERE);
  assert.equal(result.START_HERE.length, 5);
  assert.deepEqual(result.POSITION, {
    source: 'ai-state.json',
    updated_at: '2026-10-08',
    status: 'test status',
    summary: 'test summary',
    working_coordinate: 'test coordinate'
  });
});

test('keeps the top-level state surface intentionally small', () => {
  const root = fixture();
  const result = compileFlowWorldState(root);

  assert.deepEqual(Object.keys(result), [
    'schema',
    'IDENTITY',
    'START_HERE',
    'POSITION',
    'BOUNDARY',
    'SURFACES',
    'VISIBILITY',
    'DESCENT',
    'SOURCES'
  ]);
  assert.equal('TOOLS' in result, false);
  assert.equal('ROUTES' in result, false);
  assert.equal('PRIVATE_CONTINUITY' in result, false);
  assert.equal('PROJECTION_RULES' in result, false);
});

test('shows available surfaces without copying tool contracts', () => {
  const root = fixture();
  const result = compileFlowWorldState(root);

  assert.deepEqual(result.SURFACES, [
    { id: 'tool-a', type: 'local_utility', location: '#a', machine_definition: true },
    { id: 'tool-b', type: 'observer', location: '#b', machine_definition: false }
  ]);
  assert.deepEqual(
    result.VISIBILITY.coverage_gaps.surface_ids_without_machine_definition,
    ['tool-b']
  );
  assert.equal(result.DESCENT.tool_contract, 'ai-tools.json');
});

test('keeps core boundaries visible without copying the full policy', () => {
  const root = fixture();
  const result = compileFlowWorldState(root);

  assert.deepEqual(
    result.BOUNDARY.items.map(item => item.key),
    ['evidence', 'unknown', 'parent_purpose', 'private_continuity']
  );
  assert.deepEqual(result.VISIBILITY.coverage_gaps.missing_boundary_keys, []);
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
