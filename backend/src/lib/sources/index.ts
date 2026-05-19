import type { SourceAdapter, SourceId } from './types';
import { FestaAdapter } from './festa';
import { EventusAdapter } from './eventus';
import { LumaAdapter } from './luma';
import { DevEventAdapter } from './dev-event';
import { DevpostAdapter } from './devpost';

export const ALL_ADAPTERS: SourceAdapter[] = [
  new FestaAdapter(),
  new EventusAdapter(),
  new LumaAdapter(),
  new DevEventAdapter(),
  new DevpostAdapter(),
];

export function getAdapter(id: SourceId): SourceAdapter | undefined {
  return ALL_ADAPTERS.find((a) => a.id === id);
}

export function getEnabledAdapters(filter?: SourceId[]): SourceAdapter[] {
  const set = filter && filter.length > 0 ? new Set<SourceId>(filter) : null;
  return ALL_ADAPTERS.filter((a) => a.enabled && (!set || set.has(a.id)));
}

export * from './types';
export { normalize, buildDedupeHash } from './normalize';
export { classifyEvent } from './ai-classifier';
