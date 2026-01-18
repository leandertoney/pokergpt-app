// Session tracking types for low-friction poker session management

export type Stakes = '$1/2' | '$1/3' | '$2/5' | '$5/10' | 'custom';

export const STAKES_OPTIONS: Stakes[] = ['$1/2', '$1/3', '$2/5', '$5/10', 'custom'];

export const BUYIN_OPTIONS = [100, 200, 300, 500] as const;

export type Session = {
  id: string;
  startTime: number;
  endTime?: number;
  stakes?: Stakes;
  customStakes?: string;
  buyIn?: number;
  result?: number; // positive = profit, negative = loss
  handIds: string[]; // linked hand IDs
  chatIds: string[]; // linked chat conversation IDs
  notes?: string;
};

export type ActiveSession = {
  id: string;
  startTime: number;
  stakes?: Stakes;
  customStakes?: string;
  buyIn?: number;
  handIds: string[];
  chatIds: string[];
};

// User's session preferences (remembered for quick-start)
export type SessionPreferences = {
  lastStakes?: Stakes;
  lastCustomStakes?: string;
  lastBuyIn?: number;
};

// Helper to format elapsed time as HH:MM:SS or MM:SS
export function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper to format result as +$X or -$X
export function formatResult(result: number): string {
  if (result >= 0) {
    return `+$${result}`;
  }
  return `-$${Math.abs(result)}`;
}

// Helper to get session duration in hours
export function getSessionDurationHours(session: Session): number {
  const endTime = session.endTime || Date.now();
  return (endTime - session.startTime) / (1000 * 60 * 60);
}
