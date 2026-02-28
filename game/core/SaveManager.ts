/**
 * Persists and loads save slots via localStorage.
 * Slots: 1, 2, 3. Each stores playing state, class, screen, and level for resume.
 */
const STORAGE_PREFIX = 'dungeon-crawl-save-';
const SLOT_IDS = ['1', '2', '3'] as const;

export interface SavePayload {
    version: number;
    playingState: Record<string, unknown>;
    playerClass: 'warrior' | 'mage' | 'rogue';
    screen: 'hub' | 'playing';
    levelId: number;
    savedAt: string;
    /** For hub: current health/stamina to restore on load */
    playerHealth?: number;
    playerStamina?: number;
}

export interface SaveSlotInfo {
    id: string;
    label: string;
    savedAt: string | null;
    isEmpty: boolean;
}

function storageKey(id: string): string {
    return `${STORAGE_PREFIX}${id}`;
}

export function listSaveSlots(): SaveSlotInfo[] {
    return SLOT_IDS.map((id) => {
        try {
            const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey(id)) : null;
            if (!raw) {
                return { id, label: 'Empty slot', savedAt: null, isEmpty: true };
            }
            const data = JSON.parse(raw) as SavePayload;
            const classLabel = data.playerClass ? data.playerClass.charAt(0).toUpperCase() + data.playerClass.slice(1) : 'Unknown';
            const location = data.levelId === 0 ? 'Sanctuary' : (data.screen === 'playing' ? `Level ${data.levelId}` : 'Sanctuary');
            const date = data.savedAt ? new Date(data.savedAt) : null;
            const timeStr = date ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            return {
                id,
                label: `${classLabel} — ${location}${timeStr ? ` · ${timeStr}` : ''}`,
                savedAt: data.savedAt ?? null,
                isEmpty: false
            };
        } catch {
            return { id, label: 'Empty slot', savedAt: null, isEmpty: true };
        }
    });
}

export function loadSave(id: string): SavePayload | null {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey(id)) : null;
        if (!raw) return null;
        return JSON.parse(raw) as SavePayload;
    } catch {
        return null;
    }
}

export function saveToSlot(id: string, payload: Omit<SavePayload, 'version' | 'savedAt'>): void {
    const full: SavePayload = {
        ...payload,
        version: 1,
        savedAt: new Date().toISOString()
    };
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey(id), JSON.stringify(full));
        }
    } catch (_) {
        // ignore
    }
}

export function deleteSave(id: string): void {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(storageKey(id));
        }
    } catch (_) {
        // ignore
    }
}
