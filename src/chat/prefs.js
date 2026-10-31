import { store } from '../core/store.js';
import { EV, STORE, emit } from '../core/consts.js';

const DEFAULT_ORDER = ['g', 'tr', 'ev', 'mn', 'dm'];
const TAB_IDS = new Set(DEFAULT_ORDER);
const DEFAULT_RECENT_LIMIT = 20;
const MAX_RECENT_LIMIT = 100;

export const CHAT_TABS = [
    { id: 'g',  label: 'Город' },
    { id: 'tr', label: 'Торговля' },
    { id: 'ev', label: 'Достижения' },
    { id: 'mn', label: 'Шахта' },
    { id: 'dm', label: 'Личные' },
];

export function createPref(key, { read = (value) => value, write = (value) => value } = {}) {
    return {
        get() {
            return read(store.get(key));
        },
        set(value) {
            store.set(key, write(value));
            return value;
        }
    };
}

function normalizeChatTabs(value) {
    const prefs = value && typeof value === 'object' ? value : {};
    const hasMineTab = Array.isArray(prefs.order) && prefs.order.includes('mn');
    const savedOrder = Array.isArray(prefs.order)
        ? prefs.order.filter((id) => TAB_IDS.has(id))
        : [];
    const order = [...new Set([...savedOrder, ...DEFAULT_ORDER])];
    const hiddenValues = prefs.hidden instanceof Set
        ? [...prefs.hidden]
        : Array.isArray(prefs.hidden) ? prefs.hidden : [];
    const hidden = new Set(hiddenValues.filter((id) => TAB_IDS.has(id)));
    if (!hasMineTab && hidden.has('g')) hidden.add('mn');
    if (hidden.size === order.length) hidden.delete(order[0]);
    return { order, hidden };
}

const chatTabsPref = createPref(STORE.chatTabPrefs, {
    read: normalizeChatTabs,
    write: (value) => {
        const prefs = normalizeChatTabs(value);
        return { order: prefs.order, hidden: [...prefs.hidden] };
    }
});

export function getChatTabPrefs() {
    return chatTabsPref.get();
}

export function setChatTabPrefs(prefs) {
    chatTabsPref.set(prefs);
    emit(EV.chatTabsChange);
}

function normalizeRecentLimit(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
        ? Math.max(1, Math.min(MAX_RECENT_LIMIT, Math.round(parsed)))
        : DEFAULT_RECENT_LIMIT;
}

const recentLimitPref = createPref(STORE.recentEmoteLimit, {
    read: (value) => Number.isInteger(Number(value))
        ? Math.max(1, Math.min(MAX_RECENT_LIMIT, Number(value)))
        : DEFAULT_RECENT_LIMIT,
    write: normalizeRecentLimit
});

export function getRecentLimit() {
    return recentLimitPref.get();
}

export function setRecentLimit(value) {
    const limit = normalizeRecentLimit(value);
    recentLimitPref.set(limit);
    const recent = store.get(STORE.recentEmotes);
    if (Array.isArray(recent)) store.set(STORE.recentEmotes, recent.slice(-limit));
    emit(EV.recentLimitChange);
    return limit;
}