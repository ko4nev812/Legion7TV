import { store } from '../core/store.js';
import { mutatePreservingScroll } from './scrollState.js';

const ID = /^[a-zA-Z0-9]{1,32}$/;
// Each image host gets its own namespace. `img` is the legacy imgBB alias.
const TOKEN = /\{(?:imgbb|img):([a-zA-Z0-9]{1,32})\}/g;
export const imageToken = (id) => isDirectImage(id) ? id : 'https://ibb.co/' + id;
const URL_PATTERN = /(?<![\w@./-])(?:https?:\/\/)?(?:www\.)?ibb\.co\/([a-zA-Z0-9]{1,32})\/?(?![a-zA-Z0-9/_-]|\.[a-zA-Z0-9])(?:[?#][^\s<>"']*)?/gi;
const IMAGE_PATTERN = new RegExp(TOKEN.source + '|' + URL_PATTERN.source + '|\\[ref\\]\\{(?:www_)?ibb_co/([a-zA-Z0-9]{1,32})\\}|(https://i\\.ibb\\.co/[a-zA-Z0-9_-]+/[^\\s<>"\\\']+)|\\[ref\\]\\{(i_ibb_co/[a-zA-Z0-9_-]+/[^\\s{}]+)\\}', 'gi');
function isDirectImage(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname === 'i.ibb.co' && /^\/[a-zA-Z0-9_-]+\/[^/]+/.test(url.pathname);
    } catch { return false; }
}
function directRefUrl(body) { return 'https://' + body.replace(/^i_ibb_co\//i, 'i.ibb.co/').replace(/%2E/gi, '.'); }
function matchId(match) {
    return match[1] || match[2] || match[3] || match[4]?.replace(/[.,!?;:)]+$/, '') || (match[5] && directRefUrl(match[5]));
}
export const imagePrefs = () => {
    const p = store.get('t7Images') || {};
    return { mode: ['off', 'link', 'image'].includes(p.mode) ? p.mode : 'image', button: p.button === true,
        height: Math.max(60, Math.min(1000, Number(p.height) || 250)) };
};
export function setImagePrefs(value) {
    store.set('t7Images', { ...imagePrefs(), ...value });
    document.dispatchEvent(new Event('t7-images-change'));
}
export function imageId(value) {
    if (isDirectImage(value)) return value;
    const token = /^\{(?:imgbb|img):([a-zA-Z0-9]{1,32})\}$/.exec(String(value).trim());
    if (token) return token[1];
    try {
        const url = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
        const id = url.pathname.replace(/^\//, '').replace(/\/$/, '');
        return ['http:', 'https:'].includes(url.protocol) && ['ibb.co', 'www.ibb.co'].includes(url.hostname) && ID.test(id) ? id : null;
    } catch { return null; }
}
export const encodeImageLinks = (text) => text.replace(IMAGE_PATTERN, (raw, legacy, url, ref, direct, directRef) => direct || (directRef ? directRefUrl(directRef) : imageToken(legacy || url || ref)));
export const imageIds = (text) => [...new Set([...text.matchAll(IMAGE_PATTERN)].map(matchId))];
export function savedImages(key) {
    const ids = store.get('t7Images:' + key);
    return Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === 'string' && (ID.test(id) || isDirectImage(id))))] : [];
}
export function rememberImages(text) {
    const ids = imageIds(text);
    if (!ids.length) return;
    store.set('t7Images:recent', [...ids.reverse(), ...savedImages('recent').filter((id) => !ids.includes(id))].slice(0, 10));
    document.dispatchEvent(new Event('t7-image-library-change'));
}
function toggleFavorite(id) {
    const ids = savedImages('favorites');
    store.set('t7Images:favorites', ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids]);
    document.dispatchEvent(new Event('t7-image-library-change'));
}

const requests = new Map();
const waiting = [];
let active = 0;
function pump() {
    while (active < 4 && waiting.length) {
        const job = waiting.shift();
        active++;
        job().finally(() => { active--; pump(); });
    }
}

// The game's img-src permits blob: URLs, but blocks remote image URLs.
// Download with Tampermonkey, keeping the original bytes (including GIF frames).
function downloadImage(src) {
    return new Promise((resolve, reject) => {
        const fail = () => reject(new Error('Ошибка изображения'));
        try {
            GM_xmlhttpRequest({ method: 'GET', url: src, responseType: 'arraybuffer', timeout: 30000,
                onerror: fail, ontimeout: fail, onabort: fail,
                onload(response) {
                    try {
                        const type = /^content-type:\s*(image\/[a-z0-9.+-]+)/im.exec(response.responseHeaders || '')?.[1].toLowerCase();
                        if (response.status !== 200 || !type || !response.response?.byteLength) throw new Error();
                        resolve(URL.createObjectURL(new Blob([response.response], { type })));
                    } catch { fail(); }
                }
            });
        } catch { fail(); }
    });
}

export function resolveImage(id) {
    if (!ID.test(id) && !isDirectImage(id)) return Promise.reject(new Error('Неверная ссылка'));
    if (requests.has(id)) return requests.get(id);
    const request = new Promise((resolve, reject) => {
        waiting.push(() => new Promise((done) => {
            const fail = () => { reject(new Error('Ошибка imgBB')); done(); };
            try {
                if (isDirectImage(id)) {
                    downloadImage(id).then(resolve, reject).finally(done);
                    return;
                }
                GM_xmlhttpRequest({ method: 'GET', url: 'https://ibb.co/' + id, timeout: 15000,
                    onerror: fail, ontimeout: fail, onabort: fail,
                    async onload(response) {
                        try {
                            if (response.status !== 200) throw new Error();
                            const page = new DOMParser().parseFromString(response.responseText, 'text/html');
                            const candidates = [
                                page.querySelector('#image-viewer-container img')?.getAttribute('src'),
                                page.querySelector('link[rel="image_src"]')?.getAttribute('href'),
                                page.querySelector('meta[property="og:image"]')?.getAttribute('content')
                            ];
                            const src = candidates.find((value) => {
                                try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'i.ibb.co'; }
                                catch { return false; }
                            });
                            if (!src) throw new Error();
                            resolve(await downloadImage(src));
                            done();
                        } catch { fail(); }
                    }
                });
            } catch { fail(); }
        }));
        pump();
    });
    requests.set(id, request);
    request.catch(() => { if (requests.get(id) === request) requests.delete(id); });
    return request;
}

function errorText(element, message) {
    element.classList.add('t7-image-error');
    element.textContent = String(message).slice(0, 20);
}
const lazyImages = new WeakMap();
let observer;
function loadCard(card) {
    const data = lazyImages.get(card);
    if (!data) return;
    lazyImages.delete(card);
    const { id, image, link } = data;
    resolveImage(id).then(async (src) => {
        if (!card.isConnected) return;
        image.src = src;
        await image.decode();
        if (!card.isConnected) return;
        mutatePreservingScroll(card, () => {
            if (image.naturalHeight) card.style.setProperty('--t7-image-width', (imagePrefs().height * image.naturalWidth / image.naturalHeight) + 'px');
            link.replaceChildren(image);
        });
    }).catch(() => {
        if (card.isConnected) mutatePreservingScroll(card, () => errorText(card, 'Ошибка imgBB'));
    });
}
export function imageCard(id) {
    const card = document.createElement('span');
    card.className = 't7-image-card';
    card.style.setProperty('--t7-image-height', imagePrefs().height + 'px');
    const link = document.createElement('a');
    link.href = imageToken(id);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const image = document.createElement('img');
    image.alt = 'Изображение imgBB';
    image.referrerPolicy = 'no-referrer';
    link.textContent = 'Загрузка…';
    const star = document.createElement('button');
    star.type = 'button';
    star.className = 't7-image-star';
    const update = () => {
        const saved = savedImages('favorites').includes(id);
        star.textContent = saved ? '★' : '☆';
        star.title = saved ? 'Убрать из избранного' : 'В избранное';
        star.setAttribute('aria-label', star.title);
        star.setAttribute('aria-pressed', String(saved));
    };
    update();
    star.onclick = (event) => { event.preventDefault(); event.stopPropagation(); toggleFavorite(id); update(); };
    card.append(link, star);
    lazyImages.set(card, { id, image, link });
    if (!observer) observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.target.isConnected) { observer.unobserve(entry.target); lazyImages.delete(entry.target); }
            else if (entry.isIntersecting) { observer.unobserve(entry.target); loadCard(entry.target); }
        }
    }, { rootMargin: '100px' });
    observer.observe(card);
    return card;
}
export function processImages({ content, kind }) {
    const mode = imagePrefs().mode;
    if (kind !== 'message' || mode === 'off') return;
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('a')) nodes.push(walker.currentNode);
    for (const node of nodes) {
        const matches = [...node.nodeValue.matchAll(IMAGE_PATTERN)];
        if (!matches.length) continue;
        const fragment = document.createDocumentFragment();
        let offset = 0;
        for (const match of matches) {
            const id = matchId(match);
            fragment.append(document.createTextNode(node.nodeValue.slice(offset, match.index)));
            if (mode === 'image') fragment.append(imageCard(id));
            else {
                const link = document.createElement('a');
                link.href = imageToken(id); link.textContent = link.href;
                link.target = '_blank'; link.rel = 'noopener noreferrer'; fragment.append(link);
            }
            offset = match.index + match[0].length;
            if (match[4] && match[4].length > id.length) fragment.append(document.createTextNode(match[4].slice(id.length)));
        }
        fragment.append(document.createTextNode(node.nodeValue.slice(offset)));
        node.replaceWith(fragment);
    }
}
