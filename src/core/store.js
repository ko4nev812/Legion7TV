export const store = {
    get: (k) => { try { return GM_getValue(k, undefined); } catch { return undefined; } },
    set: (k, v) => { try { GM_setValue(k, v); } catch {} }
};