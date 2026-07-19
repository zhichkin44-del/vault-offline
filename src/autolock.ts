export const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export interface AutoLockState {
  enabled: boolean;
  timeoutMs: number;
  lastActivity: number;
}

export function createState(timeoutMs: number, now: number): AutoLockState {
  return { enabled: true, timeoutMs, lastActivity: now };
}

export function recordActivity(s: AutoLockState, now: number): AutoLockState {
  return { ...s, lastActivity: now };
}

export function shouldLock(s: AutoLockState, now: number): boolean {
  if (!s.enabled) return false;
  return now - s.lastActivity >= s.timeoutMs;
}

export function disable(s: AutoLockState): AutoLockState {
  return { ...s, enabled: false };
}

export function enable(s: AutoLockState, now: number): AutoLockState {
  return { ...s, enabled: true, lastActivity: now };
}
