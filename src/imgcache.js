import { getBuf } from './net.js';

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

// Приоритеты: 0 — фоновая предзагрузка, 1 — видимая часть пикера, 2 — чат/tooltip.
// Низкие приоритеты занимают не все слоты, поэтому быстрая прокрутка не ждёт старую очередь.
const Q = { wait: [], run: 0, running: [0, 0, 0], max: 10, next: 0 };
const limitFor = (priority) => priority === 0 ? 4 : priority === 1 ? 8 : Q.max;

function pump() {
    while (Q.run < Q.max) {
        let best = -1;
        for (let i = 0; i < Q.wait.length; i++) {
            const a = Q.wait[i], b = Q.wait[best];
            if (best < 0 || a.priority > b.priority || (a.priority === b.priority && a.order < b.order)) best = i;
        }
        if (best < 0) return;
        const j = Q.wait[best];
        if (Q.run >= limitFor(j.priority)) return;   // оставляем место более срочным запросам
        Q.wait.splice(best, 1);
        j.started = true;
        Q.run++;
        Q.running[j.priority]++;
        Promise.resolve().then(j.fn).then(j.res, j.rej).finally(() => {
            Q.run--;
            Q.running[j.priority]--;
            pump();
        });
    }
}

function enqueue(fn, priority) {
    let job;
    const promise = new Promise((res, rej) => {
        job = { fn, res, rej, priority, order: Q.next++, started: false };
        Q.wait.push(job);
        pump();
    });
    return {
        promise,
        promote(nextPriority) {
            if (!job.started && nextPriority > job.priority) {
                job.priority = nextPriority;
                pump();
            }
        }
    };
}

const priorityOf = (value) => typeof value === 'number'
    ? Math.max(0, Math.min(2, Math.round(value)))
    : value ? 2 : 0;

const imgCache = new Map();   // url -> { promise, promote }

export function fetchImg(url, priority) {
    const requested = priorityOf(priority);
    const cached = imgCache.get(url);
    if (cached) {
        cached.promote(requested);
        return cached.promise;
    }

    let wanted = requested;
    let queued = null;
    const record = {
        promise: null,
        promote(nextPriority) {
            wanted = Math.max(wanted, nextPriority);
            if (queued) queued.promote(wanted);
        }
    };
    record.promise = (async () => {
        let blob = await DB.get(url);
        if (!blob) {
            queued = enqueue(() => getBuf(url), wanted);
            blob = await queued.promise;
            DB.set(url, blob);
        }
        return URL.createObjectURL(blob);
    })();
    record.promise.catch(() => {
        if (imgCache.get(url) === record) imgCache.delete(url);
    });
    imgCache.set(url, record);
    return record.promise;
}

export async function clearImgs() {
    imgCache.clear();
    await DB.clear();
}
