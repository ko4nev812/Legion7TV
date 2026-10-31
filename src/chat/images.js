import { store } from '../core/store.js';

const ID = /^[a-zA-Z0-9]{1,32}$/;
const TOKEN = /\{img:([a-zA-Z0-9]{1,32})\}/g;
const URL_PATTERN = /(?<![\w@./-])(?:https?:\/\/)?(?:www\.)?postimg\.cc\/([a-zA-Z0-9]{1,32})\/?(?![a-zA-Z0-9/_-]|\.[a-zA-Z0-9])(?:[?#][^\s<>"']*)?/gi;
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
    const token = /^\{img:([a-zA-Z0-9]{1,32})\}$/.exec(String(value).trim());
    if (token) return token[1];
    try {
        const url = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
        const id = url.pathname.replace(/^\//, '').replace(/\/$/, '');
        return ['http:', 'https:'].includes(url.protocol) && ['postimg.cc', 'www.postimg.cc'].includes(url.hostname) && ID.test(id) ? id : null;
    } catch { return null; }
}
export const encodeImageLinks = (text) => text.replace(URL_PATTERN, (_, id) => `{img:${id}}`);
export const imageIds = (text) => [...new Set([...text.matchAll(TOKEN)].map((m) => m[1]))];
export function savedImages(key) {
    const ids = store.get('t7Postimages:' + key);
    return Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === 'string' && ID.test(id)))] : [];
}
export function rememberImages(text) {
    const ids = imageIds(text);
    if (!ids.length) return;
    store.set('t7Postimages:recent', [...ids.reverse(), ...savedImages('recent').filter((id) => !ids.includes(id))].slice(0, 10));
    document.dispatchEvent(new Event('t7-image-library-change'));
}
function toggleFavorite(id) {
    const ids = savedImages('favorites');
    store.set('t7Postimages:favorites', ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids]);
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
    if (!ID.test(id)) return Promise.reject(new Error('Неверная ссылка'));
    if (requests.has(id)) return requests.get(id);
    const request = new Promise((resolve, reject) => {
        waiting.push(() => new Promise((done) => {
            const fail = () => { reject(new Error('Ошибка Postimages')); done(); };
            try {
                GM_xmlhttpRequest({ method: 'GET', url: 'https://postimg.cc/' + id, timeout: 15000,
                    onerror: fail, ontimeout: fail, onabort: fail,
                    async onload(response) {
                        try {
                            if (response.status !== 200) throw new Error();
                            const page = new DOMParser().parseFromString(response.responseText, 'text/html');
                            const candidates = [
                                page.querySelector('#main-image')?.getAttribute('src'),
                                page.querySelector('link[rel="image_src"]')?.getAttribute('href'),
                                page.querySelector('meta[property="og:image"]')?.getAttribute('content')
                            ];
                            const src = candidates.find((value) => {
                                try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'i.postimg.cc'; }
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
    const { id, image, stickFrom } = data;
    resolveImage(id).then((src) => { if (card.isConnected) image.src = src; }, () => {
        if (card.isConnected) { errorText(card, 'Ошибка Postimages'); stickFrom(card); }
    });
}
export function imageCard(id, stickFrom = () => {}) {
    const card = document.createElement('span');
    card.className = 't7-image-card';
    card.style.setProperty('--t7-image-height', imagePrefs().height + 'px');
    const link = document.createElement('a');
    link.href = 'https://postimg.cc/' + id;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const image = document.createElement('img');
    image.alt = 'Изображение Postimages';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('load', () => {
        if (image.naturalHeight) card.style.setProperty('--t7-image-width', (imagePrefs().height * image.naturalWidth / image.naturalHeight) + 'px');
        stickFrom(card);
    });
    image.addEventListener('error', () => { errorText(card, 'Ошибка изображения'); stickFrom(card); });
    link.append(image);
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
    lazyImages.set(card, { id, image, stickFrom });
    if (!observer) observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.target.isConnected) { observer.unobserve(entry.target); lazyImages.delete(entry.target); }
            else if (entry.isIntersecting) { observer.unobserve(entry.target); loadCard(entry.target); }
        }
    }, { rootMargin: '100px' });
    observer.observe(card);
    return card;
}
export function processImages({ content, kind, stickFrom }) {
    const mode = imagePrefs().mode;
    if (kind !== 'message' || mode === 'off') return;
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('a')) nodes.push(walker.currentNode);
    for (const node of nodes) {
        const matches = [...node.nodeValue.matchAll(TOKEN)];
        if (!matches.length) continue;
        const fragment = document.createDocumentFragment();
        let offset = 0;
        for (const match of matches) {
            fragment.append(document.createTextNode(node.nodeValue.slice(offset, match.index)));
            if (mode === 'image') fragment.append(imageCard(match[1], stickFrom));
            else {
                const link = document.createElement('a');
                link.href = 'https://postimg.cc/' + match[1]; link.textContent = link.href;
                link.target = '_blank'; link.rel = 'noopener noreferrer'; fragment.append(link);
            }
            offset = match.index + match[0].length;
        }
        fragment.append(document.createTextNode(node.nodeValue.slice(offset)));
        node.replaceWith(fragment);
    }
}
