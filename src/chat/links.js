// Ссылки в чате: отправка через [ref]{...}, разбор на приёме
import { store } from '../core/store.js';
import { STORE } from '../core/consts.js';

export const SAY_RE = /^\/api\/(?:chat\/say|city\/say|mine\/chat\/say|dm\/say)(?:\?|$)/;
const LINK_ENCODING_KEY = STORE.linkEncoding;

export const isLinkEncodingEnabled = () => store.get(LINK_ENCODING_KEY) === true;
export const setLinkEncodingEnabled = (enabled) => store.set(LINK_ENCODING_KEY, !!enabled);

const HTTP_RE = /(?<![\p{L}\p{N}_])http:\/\/\S/iu;
const URL_RE = /\[ref\]\{[^{}\s]+\}|https:\/\/[^\s<>"']+|www\.[^\s<>"']+/giu;
const HOST_OK = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
// bare-домены: 2 латинские буквы (ccTLD) или частые общие зоны; так "кто.то" и "main.txt" ссылками не считаются
const TLD = '[a-z]{2}|com|net|org|info|dev|app|xyz|online|site|tech|gov|edu|club|shop|store|blog|cloud|live|link';
const LINK_RE = new RegExp(
    '(?<![\\p{L}\\p{N}_@/.:%-])(?:https:\\/\\/)?' +
    '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:' + TLD + ')(?![\\p{L}\\p{N}-])' +
    '(?::\\d{1,5})?(?:[/?#]\\S*)?', 'giu');

export function trimTrailingPunct(raw, options = {}) {
    let end = raw.length;
    while (end > 0) {
        const char = raw[end - 1];
        if (/[.,!?;:]/.test(char) || (options.stripQuotes && (char === '"' || char === "'")) || (options.stripBrackets && char === ']')) {
            end--;
            continue;
        }
        if (char === ')') {
            const text = raw.slice(0, end);
            const unbalanced = (text.match(/\)/g) || []).length > (text.match(/\(/g) || []).length;
            if (options.stripClosingParens || unbalanced) {
                end--;
                continue;
            }
        }
        break;
    }
    return { clean: raw.slice(0, end), tail: raw.slice(end) };
}

export function isSafeHttpsUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && HOST_OK.test(url.hostname);
    } catch {
        return false;
    }
}

function encodeOne(raw) {
    let { clean: url, tail } = trimTrailingPunct(raw, {
        stripClosingParens: true,
        stripQuotes: true,
        stripBrackets: true
    });
    url = url.replace(/^https:\/\//i, '');
    const i = url.search(/[/?#]/);
    const host = (i < 0 ? url : url.slice(0, i)).toLowerCase().replace(/\./g, '_');
    const rest = i < 0 ? '' : url.slice(i).replace(/\./g, '%2E').replace(/\{/g, '%7B').replace(/\}/g, '%7D');
    return '[ref]{' + host + rest + '}' + tail;
}
export const encodeLinks = (text) => text.replace(LINK_RE, encodeOne);

// [ref]{www_bergfex_at/w/geierhaupt} -> https://www.bergfex.at/w/geierhaupt
export function refToUrl(body) {
    const i = body.search(/[/?#]/);
    const host = (i < 0 ? body : body.slice(0, i)).replace(/_/g, '.');
    const rest = i < 0 ? '' : body.slice(i).replace(/%2E/gi, '.');
    return 'https://' + host + rest;
}

function linkifyText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
        if (node.parentElement && node.parentElement.closest('a')) continue;
        const text = node.nodeValue;
        const matches = [...text.matchAll(URL_RE)];
        if (!matches.length) continue;

        const fragment = document.createDocumentFragment();
        let offset = 0;
        for (const match of matches) {
            const start = match.index;
            if (start < offset) continue;
            const { clean: url } = trimTrailingPunct(match[0]);
            let href, label;
            if (/^\[ref\]/i.test(url)) {
                href = refToUrl(url.slice(6, -1));
                label = href.slice(8);
            } else {
                href = url.startsWith('www.') ? 'https://' + url : url;
                label = url;
            }

            fragment.appendChild(document.createTextNode(text.slice(offset, start)));
            if (isSafeHttpsUrl(href)) {
                const anchor = document.createElement('a');
                anchor.className = 't7-link';
                anchor.href = href;
                anchor.title = href;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.textContent = label;
                fragment.appendChild(anchor);
                offset = start + url.length;
            } else {
                fragment.appendChild(document.createTextNode(match[0]));
                offset = start + match[0].length;
            }
        }
        fragment.appendChild(document.createTextNode(text.slice(offset)));
        node.replaceWith(fragment);
    }
}

export function processLinks({ content }) {
    if (!isLinkEncodingEnabled()) return;
    linkifyText(content);
}

// call(path, body) - исходный api сайта
export async function sendWithLinks(call, path, body) {
    if (!isLinkEncodingEnabled()) return call(path, body);
    const text = body && body.text;
    if (typeof text !== 'string') return call(path, body);
    if (HTTP_RE.test(text)) return { ok: false, error: 'ссылки http:// не отправляются - используй https://' };
    const encoded = encodeLinks(text);
    return call(path, encoded === text ? body : { ...body, text: encoded });
}