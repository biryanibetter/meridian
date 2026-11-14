import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeed, makeTasks } from "../lib/demo";

const journey = createSeed().journeys[0];

test("study and work journeys receive purpose-specific planning tasks", () => {
  const study = makeTasks({ ...journey, purpose: "International study" });
  const work = makeTasks({ ...journey, purpose: "Business work" });

  assert.ok(study.some((task) => /enrol|university|study/i.test(task.title)));
  assert.ok(work.some((task) => /employer|workplace|work/i.test(task.title)));
  assert.deepEqual(study.map((task) => task.id), work.map((task) => task.id));
});

test("tourism, family, transit and relocation tasks reflect the journey purpose", () => {
  const tourism = makeTasks({ ...journey, purpose: "Tourism", mode: "Trip" });
  const family = makeTasks({ ...journey, purpose: "Family holiday", mode: "Family" });
  const transit = makeTasks({ ...journey, purpose: "Transit", mode: "Transit" });
  const relocation = makeTasks({ ...journey, purpose: "Relocation", mode: "Move" });

  assert.ok(tourism.some((task) => /itinerary|activities|tourism/i.test(task.title)));
  assert.ok(family.some((task) => /family|travelers|travellers/i.test(task.title)));
  assert.ok(transit.some((task) => /connection|transit/i.test(task.title)));
  assert.ok(relocation.some((task) => /accommodation|relocation|settling/i.test(task.title)));
});

test("transit preparation is omitted when a journey has no transit stop", () => {
  const tasks = makeTasks({ ...journey, transit: "", purpose: "Tourism" });

  assert.equal(tasks.some((task) => task.id.endsWith("-t7")), false);
  assert.deepEqual(
    tasks.map((task) => task.id),
    ["london-t1", "london-t2", "london-t3", "london-t4", "london-t5", "london-t6", "london-t8"],
  );
});
