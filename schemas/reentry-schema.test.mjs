import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = JSON.parse(
  await readFile(new URL("./reentry.schema.json", import.meta.url), "utf8")
);

test("re-entry schema carries optional return point metadata", () => {
  const rp = schema.properties.return_point;
  assert.ok(rp);
  assert.deepEqual(rp.type, ["object", "null"]);
  assert.ok(rp.properties.current_position);
  assert.ok(rp.properties.references);
});

test("source entries can carry observed inferred unknown stance", () => {
  const stance = schema.properties.sources.items.properties.stance;
  assert.deepEqual(stance.enum, ["observed", "inferred", "unknown"]);
});
