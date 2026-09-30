export interface QuickActionConfig {
  id: string;
  skillName: string;
  icon?: string;
}

const QUICK_ACTIONS_KEY = 'wfrp-quickActions';

/**
 * Fired after quick actions are saved so in-tab consumers (e.g. the App-level
 * QuickActionBar) can refresh live without a reload. The native `storage`
 * event only fires in OTHER tabs, so we dispatch our own for the same tab.
 */
export const QUICK_ACTIONS_CHANGE_EVENT = 'wfrp-quick-actions-change';

export function loadQuickActions(): QuickActionConfig[] {
  try {
    return JSON.parse(localStorage.getItem(QUICK_ACTIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveQuickActions(actions: QuickActionConfig[]): void {
  try {
    localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(actions));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(QUICK_ACTIONS_CHANGE_EVENT));
    }
  } catch {
    // silently fail if localStorage is unavailable
  }
}
