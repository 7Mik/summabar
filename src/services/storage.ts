import { UserSettings, DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY = 'summabar_user_settings';

export async function getSettings(): Promise<UserSettings> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (result: Record<string, any>) => {
        if (result && result[STORAGE_KEY]) {
          resolve({ ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      });
    } else {
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          resolve({ ...DEFAULT_SETTINGS, ...JSON.parse(local) });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      } catch (e) {
        resolve(DEFAULT_SETTINGS);
      }
    }
  });
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
        resolve();
      });
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.error('[SummaBar] Error saving settings to localStorage:', e);
      }
      resolve();
    }
  });
}
