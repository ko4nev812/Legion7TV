import { SIZES } from './config.js';
import { S, EM } from './state.js';
import { has } from './util.js';
import { fetchImg } from './imgcache.js';
import { urlFor } from './emotes.js';
import { setEmoteTooltipData } from './emoteTooltip.js';

/* ---------- не даём ленте «уползать» вверх, когда эмоуты увеличивают строки ---------- */
// scroll не всплывает, поэтому ловим в capture-фазе; программный рост высоты событие scroll не вызывает,
// так что флаг отражает только то, где ленту оставил пользователь (или игра)
document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('cy-chat-l'))
        t.dataset.t7end = (t.scrollHeight - t.scrollTop - t.clientHeight < 40) ? '1' : '0';
}, true);

function stickEnds() {
    document.querySelectorAll('.cy-chat-l').forEach((l) => {
        if (l.dataset.t7end !== '0') l.scrollTop = l.scrollHeight;
    });
}
function stickFrom(el) {
    const l = el.closest && el.closest('.cy-chat-l');
    if (l && l.dataset.t7end !== '0') l.scrollTop = l.scrollHeight;
}

/* ---------- подстановка эмоутов в сообщения ---------- */
function makeImg(name, em, cls) {
    const img = document.createElement('img');
    img.className = cls;
    img.alt = name;
    setEmoteTooltipData(img, name, em);
    img.addEventListener('load', () => stickFrom(img));   // ширина эмоута могла поменять перенос строк
    fetchImg(urlFor(em, SIZES[S.size].n), true).then(
        (d) => { img.src = d; },
        (e) => { console.warn('[7TV] картинка не загрузилась', name, e); img.replaceWith(document.createTextNode(name)); }
    );
    return img;
}

const NONE = {};

function processSpan(sp) {
    const act = S.on ? EM : NONE;   // эмоуты выключены - возвращаем обычный текст
    const src = sp.dataset.t7o != null ? sp.dataset.t7o : sp.textContent;
    const parts = src.split(/(\s+)/);
    if (!parts.some((p) => has(act, p))) {
        if (sp.dataset.t7o != null) { sp.textContent = src; delete sp.dataset.t7o; }
        return;
    }
    sp.dataset.t7o = src;   // исходный текст, чтобы пересобрать при смене ника / размера

    const frag = document.createDocumentFragment();
    let lastWrap = null;
    for (const p of parts) {
        const em = has(EM, p) ? EM[p] : null;
        if (em && em.zw && lastWrap) { lastWrap.appendChild(makeImg(p, em, 't7-zw')); continue; }
        if (em) {
            const w = document.createElement('span');
            w.className = 't7-w';
            w.appendChild(makeImg(p, em, 't7-e'));
            frag.appendChild(w);
            lastWrap = w;
            continue;
        }
        if (/^\s+$/.test(p)) {
            if (lastWrap) { frag.appendChild(document.createTextNode(p)); continue; }
        } else if (p) {
            lastWrap = null;
        }
        if (p) frag.appendChild(document.createTextNode(p));
    }
    sp.textContent = '';
    sp.appendChild(frag);
}

function processLi(li) {
    if (li.dataset.t7) return;
    li.dataset.t7 = '1';
    if (li.classList.contains('cy-chat-sys') || li.classList.contains('cy-chat-ev') || li.classList.contains('cy-chat-0')) return;
    const spans = li.querySelectorAll(':scope > span:not([class])');
    const sp = spans[spans.length - 1];
    if (sp) processSpan(sp);
}

export function scan() {
    const fresh = document.querySelectorAll('.cy-chat-l li:not([data-t7])');
    if (!fresh.length) return;
    fresh.forEach(processLi);
    stickEnds();   // строки стали выше от эмоутов - возвращаем ленту вниз, если она была внизу
}

export function rescanAll() {
    document.querySelectorAll('.cy-chat-l li[data-t7]').forEach((li) => { delete li.dataset.t7; });
    scan();
}

export const applySize = () => {
    document.documentElement.style.setProperty('--t7-h', SIZES[S.size].h);
    document.documentElement.style.setProperty('--t7-tile', SIZES[S.size].p + 'px');
};
