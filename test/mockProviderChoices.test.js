import test from "node:test";
import assert from "node:assert/strict";
import { MockProvider } from "../server/ai/mockProvider.js";

const provider = new MockProvider();

function baseContext(overrides = {}) {
  return {
    world: { location: "loguetown", locationType: "hafenstadt", sceneLocation: "Loguetown" },
    story: { active: [{ title: "Der verschwundene Kurier", hook: "..." }] },
    ...overrides,
  };
}

// Kernpunkt des Nutzerfeedbacks: eine im Text auffällige Person (z. B. ein
// maskierter Fremder) muss auch über eine Auswahlmöglichkeit ansprechbar
// sein — nicht nur die immer gleiche, vom Szeneninhalt unabhängige
// "nachhaken beim Story-Faden"-Option.
test("genericChoices offers a guaranteed option addressing the focus NPC", () => {
  const focusNpc = { id: "npc_maskierter_fremder", name: "Ein maskierter Fremder" };
  for (let i = 0; i < 20; i += 1) {
    const choices = provider.genericChoices(baseContext(), focusNpc);
    assert.ok(
      choices.some((c) => c.text.includes(focusNpc.name)),
      `expected a choice mentioning ${focusNpc.name}, got: ${choices.map((c) => c.text).join(" | ")}`,
    );
  }
});

test("genericChoices without a focus NPC never invents one", () => {
  for (let i = 0; i < 20; i += 1) {
    const choices = provider.genericChoices(baseContext(), null);
    assert.ok(choices.every((c) => !c.text.includes("maskiert")));
  }
});

test("genericChoices still references the active thread alongside the NPC option", () => {
  const focusNpc = { id: "npc_x", name: "Ein zwielichtiger Reisender" };
  const choices = provider.genericChoices(baseContext(), focusNpc);
  assert.ok(choices.some((c) => c.text.includes("verschwundene Kurier")));
});

// Derselbe Bug tauchte auch in der allerersten Szene des Spiels auf: der dort
// immer eingeführte NPC bekam keine eigene Option (siehe startScene).
test("startScene names the introduced NPC in at least one choice", async () => {
  const scene = await provider.generateScene({
    kind: "start",
    world: { location: "loguetown", rumors: ["Ein Gerücht."] },
    character: { archetyp: "pirat" },
    story: { active: [{ title: "Der verschwundene Kurier", hook: "..." }] },
  });
  const npcName = scene.npcs[0].name;
  assert.ok(scene.choices.some((c) => c.text.includes(npcName)));
});
