#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_PATHS = {
  entry: 'ai-entry.txt',
  state: 'ai-state.json',
  tools: 'ai-tools.json',
  relationship: 'reference/flow-memory-relationship.txt',
  reentry_schema: 'schemas/reentry.schema.json'
};

const ENTRY_HEADINGS = [
  'NORMAL ENTRY',
  'PURPOSE',
  'BASELINE COMPATIBILITY',
  'DETAIL SOURCES',
  'EXPLORATION AND REPORTING',
  'ROUTE',
  'PARENT PURPOSE BOUNDARY',
  'RELATIONSHIP BOUNDARY',
  'RE-ENTRY ROUTES',
  'AUTHORIZED CONNECTIONS / 実物への辿り方',
  'PORTABLE SHAPES',
  'TOOL RULE',
  'BOUNDARY'
];

const START_HERE = [
  'Current request sets the goal.',
  'This file is the first public view, not authority.',
  'Use only the surface relevant to the task.',
  'Descend only when detail or verification is needed.',
  'Do not assume private continuity exists.'
];

function readText(root, rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`Missing canonical source: ${rel}`);
  return fs.readFileSync(full, 'utf8');
}

function readJson(root, rel) {
  const text = readText(root, rel);
  try {
    return { text, value: JSON.parse(text) };
  } catch (error) {
    throw new Error(`Invalid JSON in canonical source ${rel}: ${error.message}`);
  }
}

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto
    .createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

function section(text, heading) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex(line => line.trim() === heading);
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (ENTRY_HEADINGS.includes(lines[i].trim())) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join('\n').trim();
}

function bullets(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.slice(2));
}

function firstMatching(items, patterns) {
  return items.find(item => patterns.some(pattern => pattern.test(item))) || null;
}

function compactSurface(tool, machineToolIds) {
  return {
    id: tool.id,
    type: tool.type ?? null,
    location: tool.location ?? null,
    machine_definition: machineToolIds.has(tool.id)
  };
}

function compileFlowWorldState(rootDir) {
  const root = path.resolve(rootDir);

  const entryText = readText(root, SOURCE_PATHS.entry);
  const stateDoc = readJson(root, SOURCE_PATHS.state);
  const toolsDoc = readJson(root, SOURCE_PATHS.tools);
  const relationshipText = readText(root, SOURCE_PATHS.relationship);
  const reentrySchemaDoc = readJson(root, SOURCE_PATHS.reentry_schema);

  const state = stateDoc.value;
  const tools = toolsDoc.value;
  const stateBoundaries = state.boundaries || [];
  const parentBoundaries = bullets(section(entryText, 'PARENT PURPOSE BOUNDARY'));
  const reentryRoutes = bullets(section(entryText, 'RE-ENTRY ROUTES'));

  const machineToolIds = new Set((tools.tools || []).map(tool => tool.id));
  const surfaces = (state.available_tools || []).map(tool => compactSurface(tool, machineToolIds));
  const surfaceIdsWithoutMachineDefinition = surfaces
    .filter(surface => !surface.machine_definition)
    .map(surface => surface.id);

  const boundaryItems = [
    {
      key: 'evidence',
      statement: firstMatching(stateBoundaries, [/Generated ideas are not evidence/i])
    },
    {
      key: 'unknown',
      statement: firstMatching(stateBoundaries, [/Unknowns remain unknown/i])
    },
    {
      key: 'parent_purpose',
      statement:
        firstMatching(stateBoundaries, [/A local improvement is not completion/i]) ||
        firstMatching(parentBoundaries, [/may update the route without becoming the parent purpose/i])
    },
    {
      key: 'private_continuity',
      statement:
        firstMatching(stateBoundaries, [/must not assume.*private continuity/i]) ||
        firstMatching(reentryRoutes, [/Never assume a particular private store exists/i])
    }
  ];

  const missingBoundaryKeys = boundaryItems
    .filter(item => !item.statement)
    .map(item => item.key);

  const sources = [
    [SOURCE_PATHS.entry, entryText, null],
    [SOURCE_PATHS.state, stateDoc.text, state.updated_at ?? null],
    [SOURCE_PATHS.tools, toolsDoc.text, tools.updated_at ?? null],
    [SOURCE_PATHS.relationship, relationshipText, null],
    [SOURCE_PATHS.reentry_schema, reentrySchemaDoc.text, reentrySchemaDoc.value.$id ?? null]
  ].map(([sourcePath, text, sourceVersion]) => ({
    path: sourcePath,
    status: 'read',
    git_blob_sha: gitBlobSha(text),
    source_version: sourceVersion
  }));

  return {
    schema: 'flow-world-state/v0.2',
    IDENTITY: {
      artifact: 'FLOW_WORLD_STATE',
      world: state.world || 'Flow World',
      authority: false,
      role: 'Derived public first view.',
      private_continuity_assumed: false
    },
    START_HERE,
    POSITION: {
      source: SOURCE_PATHS.state,
      updated_at: state.updated_at ?? null,
      status: state.current_position?.status ?? null,
      summary: state.current_position?.summary ?? null,
      working_coordinate: state.current_position?.working_coordinate ?? null
    },
    BOUNDARY: {
      sources: [SOURCE_PATHS.state, SOURCE_PATHS.entry],
      items: boundaryItems
    },
    SURFACES: surfaces,
    VISIBILITY: {
      sources_read: sources.map(source => source.path),
      source_versions: {
        ai_state: state.updated_at ?? null,
        ai_tools: tools.updated_at ?? null
      },
      source_versions_aligned: state.updated_at === tools.updated_at,
      complete_asset_inventory: false,
      browser_state_read: false,
      deployment_verified: false,
      private_sources_read: false,
      coverage_gaps: {
        surface_ids_without_machine_definition: surfaceIdsWithoutMachineDefinition,
        missing_boundary_keys: missingBoundaryKeys
      }
    },
    DESCENT: {
      routing_policy: SOURCE_PATHS.entry,
      public_state_detail: SOURCE_PATHS.state,
      tool_contract: SOURCE_PATHS.tools,
      public_private_boundary: SOURCE_PATHS.relationship,
      reentry_packet_schema: SOURCE_PATHS.reentry_schema
    },
    SOURCES: sources
  };
}

function writeCompiledState(rootDir, outputPath) {
  const state = compileFlowWorldState(rootDir);
  const out = path.resolve(rootDir, outputPath || 'FLOW_WORLD_STATE.json');
  fs.writeFileSync(out, JSON.stringify(state, null, 2) + '\n', 'utf8');
  return out;
}

if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const output = process.argv[3] || 'FLOW_WORLD_STATE.json';
  const written = writeCompiledState(root, output);
  process.stdout.write(`Wrote ${written}\n`);
}

module.exports = {
  SOURCE_PATHS,
  START_HERE,
  compileFlowWorldState,
  writeCompiledState,
  gitBlobSha,
  section,
  bullets
};
