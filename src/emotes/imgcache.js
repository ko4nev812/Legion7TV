import { getBuf } from '../network/net.js';

// IndexedDB: картинки хранятся навсегда (адрес содержит ID эмоута, содержимое не меняется)
const DB = (() => {
    let p;
    const open = () => p || (p = new Promise((res) => {
        try {
            const r = indexedDB.open('t7img', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('i');
            r.onsuccess = () => res(r.result);
            r.onerror = () => res(null);
        } catch { res(null); }
    }));
    const tx = async (mode, fn) => {
        const db = await open();
        if (!db) return undefined;
        return new Promise((res) => {
            try {
                const t = db.transaction('i', mode);
                const rq = fn(t.objectStore('i'));
                t.oncomplete = () => res(rq && rq.result);
                t.onerror = t.onabort = () => res(undefined);
            } catch { res(undefined); }
        });
    };
    return {
        get: (k) => tx('readonly', (s) => s.get(k)),
        set: (k, v) => tx('readwrite', (s) => s.put(v, k)),
        clear: () => tx('readwrite', (s) => s.clear())
    };
})();

// очередь: 8 запросов параллельно, эмоуты из чата (hi) обгоняют картинки окошка (lo)
const Q = { hi: [], lo: [], run: 0, max: 8 };
function pump() {
    while (Q.run < Q.max) {
        const j = Q.hi.shift() || Q.lo.shift();
        if (!j) return;
        Q.run++;
        j.fn().then(j.res, j.rej).finally(() => { Q.run--; pump(); });
    }
}
const enqueue = (fn, hi) => new Promise((res, rej) => { (hi ? Q.hi : Q.lo).push({ fn, res, rej }); pump(); });

const imgCache = new Map();   // url -> Promise<blob: URL>

export function fetchImg(url, hi, reusableUrls = []) {
    if (imgCache.has(url)) return imgCache.get(url);
    const p = (async () => {
        let blob = await DB.get(url);
        for (const candidate of reusableUrls) {
            if (blob) break;
            if (candidate !== url) blob = await DB.get(candidate);
        }
        if (!blob) {
            blob = await enqueue(() => getBuf(url), hi);
            DB.set(url, blob);
        }
        return URL.createObjectURL(blob);
    })();
    p.catch(() => imgCache.delete(url));
    imgCache.set(url, p);
    return p;
}

export async function clearImgs() {
    imgCache.clear();
    await DB.clear();
}