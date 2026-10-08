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
  'PURPOSE',
  'BASELINE COMPATIBILITY',
  'START HERE',
  'EXPLORATION AND REPORTING',
  'PARENT PURPOSE BOUNDARY',
  'RELATIONSHIP BOUNDARY',
  'RE-ENTRY ROUTES',
  'AUTHORIZED CONNECTIONS / 実物への辿り方',
  'PORTABLE SHAPES',
  'TOOL RULE',
  'BOUNDARY'
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

function firstBulletContaining(items, needle) {
  return items.find(item => item.includes(needle)) || null;
}

function compactToolDefinition(tool) {
  return {
    id: tool.id,
    version: tool.version ?? null,
    status: tool.status ?? null,
    implementation: tool.implementation ?? null,
    human_ui: tool.human_ui ?? null
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

  const exploration = bullets(section(entryText, 'EXPLORATION AND REPORTING'));
  const reentryRoutes = bullets(section(entryText, 'RE-ENTRY ROUTES'));
  const authorizedConnections = bullets(section(entryText, 'AUTHORIZED CONNECTIONS / 実物への辿り方'));
  const parentBoundary = bullets(section(entryText, 'PARENT PURPOSE BOUNDARY'));
  const relationshipBoundary = bullets(section(entryText, 'RELATIONSHIP BOUNDARY'));
  const finalBoundary = section(entryText, 'BOUNDARY').trim();

  const stateToolIds = (state.available_tools || []).map(tool => tool.id);
  const machineToolIds = (tools.tools || []).map(tool => tool.id);
  const machineToolSet = new Set(machineToolIds);
  const stateOnlyToolIds = stateToolIds.filter(id => !machineToolSet.has(id));

  const conflicts = [];
  if (state.updated_at !== tools.updated_at) {
    conflicts.push({
      kind: 'literal_updated_at_difference',
      sources: [SOURCE_PATHS.state, SOURCE_PATHS.tools],
      values: {
        [SOURCE_PATHS.state]: state.updated_at ?? null,
        [SOURCE_PATHS.tools]: tools.updated_at ?? null
      }
    });
  }

  if (stateOnlyToolIds.length) {
    conflicts.push({
      kind: 'machine_definition_coverage_difference',
      note: 'Coverage difference only; not treated as a semantic contradiction.',
      state_tool_ids_without_ai_tools_definition: stateOnlyToolIds
    });
  }

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
    schema: 'flow-world-state/v0.1',
    IDENTITY: {
      artifact: 'FLOW_WORLD_STATE',
      world: state.world || 'Flow World',
      authority: false,
      role: 'Derived public initial view for AI re-entry. Canonical sources remain authoritative for their own content.',
      private_continuity: {
        assumed: false,
        status: 'optional'
      }
    },
    PURPOSE: {
      public_purpose: state.purpose ?? null,
      current_request_sets_goal: true,
      current_request_rule: firstBulletContaining(exploration, 'current request sets the goal') ||
        firstBulletContaining(exploration, 'current request') ||
        null
    },
    POSITION: {
      source: SOURCE_PATHS.state,
      updated_at: state.updated_at ?? null,
      current_position: state.current_position ?? null,
      confirmed: state.confirmed ?? [],
      unknowns: state.unknowns ?? []
    },
    ROUTES: {
      public_route: firstBulletContaining(reentryRoutes, 'Public route') || null,
      personal_route: firstBulletContaining(reentryRoutes, 'Personal route') || null,
      authorized_connections: authorizedConnections
    },
    TOOLS: {
      source: SOURCE_PATHS.tools,
      available_surface_tools: state.available_tools ?? [],
      machine_definitions: (tools.tools || []).map(compactToolDefinition),
      shapes: tools.shapes ?? [],
      compatibility_policy: tools.compatibility_policy ?? null
    },
    BOUNDARY: {
      source_state_boundaries: state.boundaries ?? [],
      parent_purpose: parentBoundary,
      relationship: relationshipBoundary,
      final_entry_boundary: finalBoundary || null
    },
    PRIVATE_CONTINUITY: {
      assumed: false,
      optional: true,
      public_core_requires_private_store: false,
      relationship_reference: SOURCE_PATHS.relationship,
      personal_route: firstBulletContaining(reentryRoutes, 'Personal route') || null
    },
    VISIBILITY: {
      scope: sources.map(source => source.path),
      complete_asset_inventory: false,
      private_sources_read: false,
      deployment_state_verified: false,
      verification_required: true,
      machine_definition_coverage: {
        state_tool_ids: stateToolIds,
        ai_tools_defined_ids: machineToolIds,
        state_tool_ids_without_ai_tools_definition: stateOnlyToolIds
      },
      note: 'Compiler reads only the named public canonical sources. It does not crawl deployments, browser-local state, external services, or private continuity.'
    },
    CONFLICTS: {
      detected: conflicts.length > 0,
      semantic_conflict: 'unverified',
      items: conflicts,
      resolution: null,
      rule: 'Literal differences are surfaced for review. The compiler does not resolve semantic conflicts or decide which source should replace another.'
    },
    DESCENT_HINTS: [
      {
        when: 'Full AI entry or route policy is needed',
        read: SOURCE_PATHS.entry
      },
      {
        when: 'Public current-position detail or freshness is in question',
        read: SOURCE_PATHS.state
      },
      {
        when: 'A tool operation, precondition, output contract, or compatibility detail is needed',
        read: SOURCE_PATHS.tools
      },
      {
        when: 'The boundary between public Flow World and optional private continuity is in question',
        read: SOURCE_PATHS.relationship
      },
      {
        when: 'A portable re-entry packet must be validated or constructed',
        read: SOURCE_PATHS.reentry_schema
      }
    ],
    PROJECTION_RULES: [
      'FLOW_WORLD_STATE is derived and is not authority, permission, or proof of freshness.',
      'The current request sets the goal; projected routes and tools remain options.',
      'Do not infer missing browser state, private continuity, deployment state, or user intent.',
      'Do not resolve source differences inside the compiler.',
      'Descend only to the canonical source needed by the current request.'
    ],
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
  compileFlowWorldState,
  writeCompiledState,
  gitBlobSha,
  section,
  bullets
};
