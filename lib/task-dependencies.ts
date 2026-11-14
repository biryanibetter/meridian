import type { Task } from "./types";

export function invalidateTaskDescendants(tasks: Task[], taskId: string): Task[] {
  const invalid = new Set([taskId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of tasks) {
      if (task.dependency && invalid.has(task.dependency) && !invalid.has(task.id)) {
        invalid.add(task.id);
        changed = true;
      }
    }
  }
  return tasks.map(task => invalid.has(task.id) ? { ...task, done: false } : task);
}

export function reconcileGeneratedTasks(tasks: Task[], previousIds: string[], generated: Task[]): Task[] {
  let invalidated = tasks;
  for (const id of previousIds) invalidated = invalidateTaskDescendants(invalidated, id);
  const previous = new Set(previousIds);
  const removed = new Set(previousIds.filter(id => !generated.some(task => task.id === id)));
  const retained = invalidated.filter(task => !previous.has(task.id)).map(task =>
    task.dependency && removed.has(task.dependency)
      ? { ...task, done: false, dependency: undefined, note: "A previous prerequisite no longer applies. Review this task after the route change." }
      : task,
  );
  return [...retained, ...generated.map(task => ({ ...task, done: false }))];
}
