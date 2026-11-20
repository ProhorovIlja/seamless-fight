import { predictMotion } from './engine.mjs';

export const HISTORY_LIMIT = 12;
export const playable = s => !s.ready && !s.end && !s.over;
export function reconcile(s, slot, pending, ack) {
  const outstanding = playable(s) ? pending.filter(i => i.seq > ack).slice(-HISTORY_LIMIT) : [];
  const p = {...s.p[slot]}, q = s.p[1-slot];
  // Do not predict pushbox interactions or action movement near an opponent.
  const safe = !p.act && Math.hypot(p.x-q.x,p.y-q.y)>55;
  if (safe) for (const input of outstanding) {
    if (Math.hypot(p.x-q.x,p.y-q.y)<=55) break;
    predictMotion(p,input,q);
  }
  return {pending:outstanding,p};
}
