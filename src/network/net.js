import { store } from '../core/store.js';
import { STORE } from '../core/consts.js';

const ALLOWED = ['7tv.io', 'cdn.7tv.app', 'api.ivr.fi'];
const ROUTES = { '7tv.io': 'api', 'cdn.7tv.app': 'cdn', 'api.ivr.fi': 'ivr' };

// Прокси по умолчанию для всех, кто не настроил свой. '' = напрямую.
const DEFAULT_PROXY = '';

export const normProxy = (v) => {
    v = String(v || '').trim().replace(/\/+$/, '');
    try { const u = new URL(v); return u.protocol === 'https:' ? u.origin : ''; } catch { return ''; }
};

let proxy = (() => {
    const v = store.get(STORE.networkProxy);
    return normProxy(typeof v === 'string' ? v : DEFAULT_PROXY);
})();
let proxyDownUntil = 0;

export const getProxy = () => proxy;
export function setProxy(v) {
    proxy = normProxy(v);
    proxyDownUntil = 0;
    store.set(STORE.networkProxy, proxy);   // пустая строка = осознанно «без прокси»
}

const urlOk = (url) => {
    try { const u = new URL(url); return u.protocol === 'https:' && ALLOWED.includes(u.hostname); }
    catch { return false; }
};

function viaProxy(url) {
    const u = new URL(url);
    return `${proxy}/${ROUTES[u.hostname]}${u.pathname}${u.search}`;
}

const gmOnce = (url, responseType, timeout) => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
        method: 'GET', url, responseType, timeout,
        onload: (r) => (r.status >= 200 && r.status < 300) ? resolve(r) : reject(new Error(url + ' -> ' + r.status)),
        onerror: reject, ontimeout: reject
    });
});

const gm = async (url, responseType) => {
    if (!urlOk(url)) throw new Error('url not allowed');
    if (proxy && Date.now() > proxyDownUntil) {
        try { return await gmOnce(viaProxy(url), responseType, 6000); }
        catch { proxyDownUntil = Date.now() + 120000; }   // 2 минуты идём напрямую
    }
    return gmOnce(url, responseType, 15000);
};

// проверка прокси из настроек
export async function testProxy(v) {
    const p = normProxy(v);
    if (!p) throw new Error('нужен адрес вида https://имя.workers.dev');
    const r = await gmOnce(p + '/api/v3/emote-sets/global', undefined, 8000);
    const j = JSON.parse(r.responseText);
    if (!j || !Array.isArray(j.emotes)) throw new Error('ответ не похож на 7TV');
    return j.emotes.length;
}

export const getJson = async (url) => JSON.parse((await gm(url)).responseText);

export const getBuf = async (url) => {
    const r = await gm(url, 'blob');
    const type = (r.response && r.response.type) || 'image/webp';
    const buf = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsArrayBuffer(r.response);
    });
    return new Blob([buf], { type });
};