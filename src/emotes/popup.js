import { EM, S, st } from '../core/state.js';
import { SIZES } from '../core/config.js';
import { store } from '../core/store.js';
import { clamp } from '../core/util.js';
import { fetchImg } from './imgcache.js';
import { reusableUrlsFor, urlFor } from './emotes.js';
import { openSettings } from '../settings/settings.js';
import { getRecentLimit } from '../chat/prefs.js';
import { EV, STORE, on } from '../core/consts.js';
import { setEmoteTooltipData } from './tooltip.js';

const FAVORITES_KEY = STORE.favorites;
const RECENT_KEY = STORE.recentEmotes;
let gridMode = 'all';
let emoteData = new Map();

on(EV.recentLimitChange, () => {
    if (st.pop && gridMode === 'recent') renderGrid();
});

function readEntries(key) {
    const value = store.get(key);
    if (!Array.isArray(value)) return [];
    const entries = value.map((item) => typeof item === 'string' ? { name: item, emote: null } : item)
        .filter((item) => item && typeof item.name === 'string' && item.name);
    return [...new Map(entries.map((item) => [item.name, item])).values()];
}

function saveRecent(name) {
    const recent = readEntries(RECENT_KEY).filter((item) => item.name !== name);
    recent.push({ name, emote: EM[name] || emoteData.get(name) || null });
    store.set(RECENT_KEY, recent.slice(-getRecentLimit()));
}

export function recordRecentFromMessage(message) {
    const names = String(message || '').split(/\s+/).filter((name) => Object.prototype.hasOwnProperty.call(EM, name));
    for (const name of names) saveRecent(name);
    if (names.length && gridMode === 'recent') renderGrid();
}

function emoteFor(name) {
    return EM[name] || emoteData.get(name) || null;
}

function updateViewButtons() {
    if (!st.pop) return;
    st.pop.querySelectorAll('[data-view]').forEach((button) => {
        button.setAttribute('aria-selected', String(button.dataset.view === gridMode));
    });
}

function toggleFavorite(name) {
    const favorites = readEntries(FAVORITES_KEY);
    const index = favorites.findIndex((item) => item.name === name);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push({ name, emote: EM[name] || emoteData.get(name) || null });
    store.set(FAVORITES_KEY, favorites);
    renderGrid();
}

export function updateStatus(t) {
    const e = st.pop && st.pop.querySelector('.t7-st');
    if (e) e.textContent = t;
}

/* ---------- вставка эмоута в поле чата ---------- */
function chatInput() {
    const f = st.anchor && st.anchor.closest('form');
    return f && f.querySelector('input[type=text]');
}

function insertEmote(name) {
    const inp = chatInput();
    if (!inp || inp.disabled) return;
    const v = inp.value;
    const a = inp.selectionStart != null ? inp.selectionStart : v.length;
    const b = inp.selectionEnd != null ? inp.selectionEnd : a;
    const pre = v.slice(0, a), post = v.slice(b);
    const add = (pre && !/\s$/.test(pre) ? ' ' : '') + name + (/^\s/.test(post) ? '' : ' ');
    const nv = pre + add + post;
    if (inp.maxLength > 0 && nv.length > inp.maxLength) return false;
    inp.value = nv;
    const pos = (pre + add).length;
    try { inp.setSelectionRange(pos, pos); } catch {}
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    if (!matchMedia('(pointer: coarse)').matches) inp.focus({ preventScroll: true });
    return true;
}

/* ---------- список эмоутов ---------- */
function onVis(entries) {
    for (const en of entries) {
        if (!en.isIntersecting) continue;
        const el = en.target;
        if (st.io) st.io.unobserve(el);
        const em = emoteFor(el.dataset.name);
        if (!em || el.dataset.l) continue;
        el.dataset.l = '1';
        const resolution = SIZES[S.size].n;
        fetchImg(urlFor(em, resolution), false, reusableUrlsFor(em, resolution)).then((d) => { el.firstChild.src = d; }, () => {});
    }
}

function filterGrid() {
    if (!st.pop) return;
    const q = st.pop.querySelector('.t7-q').value.trim().toLowerCase();
    st.pop.querySelectorAll('.t7-gw').forEach((w) => {
        let vis = 0;
        w.querySelectorAll('.t7-item').forEach((item) => {
            const show = !q || item.dataset.name.toLowerCase().includes(q);
            item.hidden = !show;
            if (show) vis++;
        });
        w.hidden = !vis;
        w.previousElementSibling.hidden = !vis;
    });
}

export function renderGrid() {
    if (!st.pop) return;
    const gr = st.pop.querySelector('.t7-gr');
    st.io.disconnect();
    gr.textContent = '';
    const allNames = Object.keys(EM).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const favoriteEntries = readEntries(FAVORITES_KEY);
    const recentEntries = readEntries(RECENT_KEY).reverse();
    emoteData = new Map(Object.entries(EM));
    for (const item of [...favoriteEntries, ...recentEntries]) {
        if (!emoteData.has(item.name) && item.emote) emoteData.set(item.name, item.emote);
    }
    const favorites = favoriteEntries.map((item) => item.name);
    const names = gridMode === 'favorites' ? favoriteEntries.filter((item) => emoteFor(item.name)).map((item) => item.name)
        : gridMode === 'recent' ? recentEntries.filter((item) => emoteFor(item.name)).map((item) => item.name) : allNames;
    const sec = (title, list) => {
        if (!list.length) return;
        const h = document.createElement('div');
        h.className = 't7-sh';
        h.textContent = `${title} · ${list.length}`;
        const w = document.createElement('div');
        w.className = 't7-gw';
        for (const n of list) {
            const item = document.createElement('div');
            item.className = 't7-item';
            item.dataset.name = n;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 't7-it';
            b.dataset.name = n;
            setEmoteTooltipData(b, n, emoteFor(n));
            b.setAttribute('aria-label', n);
            const im = document.createElement('img');
            im.alt = '';
            im.decoding = 'async';
            b.appendChild(im);
            const favorite = document.createElement('button');
            const isFavorite = favorites.includes(n);
            favorite.type = 'button';
            favorite.className = 't7-fav';
            favorite.dataset.name = n;
            favorite.textContent = isFavorite ? '★' : '☆';
            favorite.title = isFavorite ? 'Убрать из избранного' : 'Добавить в избранное';
            favorite.setAttribute('aria-label', favorite.title + ': ' + n);
            favorite.setAttribute('aria-pressed', String(isFavorite));
            item.append(b, favorite);
            w.appendChild(item);
            st.io.observe(b);
        }
        gr.append(h, w);
    };
    if (gridMode === 'all') {
        sec('Канал', names.filter((n) => !EM[n].g));
        sec('Свои', names.filter((n) => EM[n].x));
        sec('Глобальные', names.filter((n) => EM[n].g && !EM[n].x));
    } else {
        sec(gridMode === 'favorites' ? 'Избранное' : 'Недавние', names);
    }
    if (!names.length) {
        const d = document.createElement('div');
        d.className = 't7-emp';
        d.textContent = gridMode === 'favorites' ? 'Избранных эмоутов пока нет в загруженных наборах'
            : gridMode === 'recent' ? 'Недавно использованных эмоутов пока нет в загруженных наборах'
                : 'Эмоутов пока нет';
        gr.appendChild(d);
    }
    filterGrid();
}

const GR_MIN = 156;
function minH(pop) {
    const gr = pop.querySelector('.t7-gr');
    const kids = [...pop.children].filter((c) => !c.classList.contains('t7-rs') && !c.hidden);
    let h = 22;   // padding 2×10 + рамка 2×1
    for (const c of kids) h += (c === gr ? GR_MIN : c.offsetHeight);
    h += 8 * (kids.length - 1);   // gap между блоками
    return Math.ceil(h);
}

/* ---------- положение и размер окошка ---------- */
export function place() {
    const pop = st.pop, anchor = st.anchor;
    if (!pop || !anchor || !anchor.isConnected) return;
    pop.style.transform = '';
    const w = clamp(st.win ? st.win.w : 340, 240, Math.max(240, innerWidth - 16));
    pop.style.width = w + 'px';
    const mh = minH(pop);
    const size = (room) => {
        room = Math.max(room, mh);
        pop.style.maxHeight = (st.win ? room : Math.min(520, room)) + 'px';
        pop.style.height = st.win ? clamp(st.win.h, mh, room) + 'px' : '';
    };
    if (st.pos) {   // окошко перетащили - держим там, где оставили (не выходя за экран)
        const x = clamp(st.pos.x, 8, Math.max(8, innerWidth - w - 8));
        const y = clamp(st.pos.y, 8, Math.max(8, innerHeight - 120));
        pop.style.left = x + 'px';
        pop.style.top = y + 'px';
        pop.style.bottom = 'auto';
        size(Math.max(200, innerHeight - y - 8));
        return;
    }
    const r = anchor.getBoundingClientRect();
    pop.style.left = clamp(r.right - w, 8, Math.max(8, innerWidth - w - 8)) + 'px';
    const above = r.top, below = innerHeight - r.bottom;
    if (above >= 300 || above > below) {
        pop.style.top = 'auto';
        pop.style.bottom = (innerHeight - r.top + 8) + 'px';
        size(Math.max(200, above - 16));
    } else {
        pop.style.bottom = 'auto';
        pop.style.top = (r.bottom + 8) + 'px';
        size(Math.max(200, below - 16));
    }
}

/* ---------- закрытие ---------- */
function onKey(e) {
    if (st.set) return;   // Esc сначала закрывает настройки
    if (e.key === 'Escape' && st.pop) {
        e.stopPropagation();
        const a = st.anchor;
        closePop();
        if (a && a.isConnected) a.focus({ preventScroll: true });
    }
}

export function closePop() {
    if (!st.pop) return;
    st.pop.remove();
    st.pop = null;
    if (st.io) st.io.disconnect();
    st.io = null;
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('resize', place);
}

function markSize(pop) {
    pop.querySelectorAll('[data-sz]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sz === S.size)));
}

/* ---------- перетаскивание за заголовок ---------- */
function setupDrag(pop) {
    const hd = pop.querySelector('.t7-h');
    hd.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || e.button > 0) return;   // кнопки в заголовке остаются кнопками
        const r = pop.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, pid = e.pointerId;
        let started = false, nx = r.left, ny = r.top, raf = 0;

        const apply = () => {
            raf = 0;
            pop.style.transform = `translate(${nx - r.left}px, ${ny - r.top}px)`;
        };
        const start = () => {
            started = true;
            // фиксируем текущее положение и высоту: во время drag раскладка не пересчитывается
            pop.style.left = r.left + 'px';
            pop.style.top = r.top + 'px';
            pop.style.bottom = 'auto';
            pop.style.maxHeight = r.height + 'px';
            pop.classList.add('t7-drag');
            try { hd.setPointerCapture(pid); } catch {}
        };
        const move = (ev) => {
            if (!started) {
                if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;   // ещё просто клик
                start();
            }
            nx = clamp(r.left + ev.clientX - sx, 8, innerWidth - r.width - 8);
            ny = clamp(r.top + ev.clientY - sy, 8, innerHeight - 120);
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const up = () => {
            hd.removeEventListener('pointermove', move);
            hd.removeEventListener('pointerup', up);
            hd.removeEventListener('pointercancel', up);
            if (raf) cancelAnimationFrame(raf);
            if (!started || st.pop !== pop) return;
            pop.classList.remove('t7-drag');
            st.pos = { x: nx, y: ny };
            store.set(STORE.popupPosition, st.pos);
            place();   // один раз: переносит transform в left/top и пересчитывает высоту
        };
        hd.addEventListener('pointermove', move);
        hd.addEventListener('pointerup', up);
        hd.addEventListener('pointercancel', up);
    });
    // двойной клик по заголовку - вернуть позицию и размер по умолчанию
    hd.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        st.pos = null;
        st.win = null;
        store.set(STORE.popupPosition, null);
        store.set(STORE.popupSize, null);
        place();
    });
}

/* ---------- ресайз за уголок ---------- */
function setupResize(pop) {
    const rs = pop.querySelector('.t7-rs');
    rs.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        e.preventDefault();
        e.stopPropagation();
        const r = pop.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY;
        pop.style.transform = '';
        pop.style.left = r.left + 'px';
        pop.style.top = r.top + 'px';
        pop.style.bottom = 'auto';
        pop.style.maxHeight = 'none';
        pop.classList.add('t7-drag');   // на время ресайза список не реагирует на мышь
        let w = r.width, h = r.height, raf = 0;
        const mh = minH(pop);
        try { rs.setPointerCapture(e.pointerId); } catch {}
        const apply = () => {
            raf = 0;
            pop.style.width = w + 'px';
            pop.style.height = h + 'px';
        };
        const move = (ev) => {
            w = clamp(r.width + ev.clientX - sx, 240, Math.max(240, innerWidth - r.left - 8));
            h = clamp(r.height + ev.clientY - sy, mh, Math.max(mh, innerHeight - r.top - 8));
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const up = () => {
            rs.removeEventListener('pointermove', move);
            rs.removeEventListener('pointerup', up);
            rs.removeEventListener('pointercancel', up);
            if (raf) cancelAnimationFrame(raf);
            if (st.pop !== pop) return;
            pop.classList.remove('t7-drag');
            st.win = { w, h };
            st.pos = { x: r.left, y: r.top };
            store.set(STORE.popupSize, st.win);
            store.set(STORE.popupPosition, st.pos);
            place();
        };
        rs.addEventListener('pointermove', move);
        rs.addEventListener('pointerup', up);
        rs.addEventListener('pointercancel', up);
    });
}

/* ---------- открытие ---------- */
function openPop(btn) {
    st.anchor = btn;
    const pop = document.createElement('div');
    st.pop = pop;
    pop.className = 't7-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Эмоуты 7TV');
    pop.innerHTML = `
        <div class="t7-h"><b>7TV</b><span class="t7-hb"><button type="button" class="t7-g" aria-label="Настройки" title="Настройки">⚙</button><button type="button" class="t7-x" aria-label="Закрыть">×</button></span></div>
        <input type="search" class="t7-q" placeholder="Поиск эмоутов" autocomplete="off" aria-label="Поиск эмоутов">
        <div class="t7-views" role="tablist" aria-label="Списки эмоутов"><button type="button" role="tab" data-view="all" aria-selected="true">Все</button><button type="button" role="tab" data-view="favorites" aria-selected="false">Избранное</button><button type="button" role="tab" data-view="recent" aria-selected="false">Недавние</button></div>
        <div class="t7-gr"></div>
        <div class="t7-rs" title="Потяни, чтобы изменить размер"></div>`;
    ['keydown', 'keyup', 'keypress'].forEach((t) => pop.addEventListener(t, (e) => e.stopPropagation()));

    setupDrag(pop);
    setupResize(pop);

    pop.querySelector('.t7-x').onclick = () => {
        const a = st.anchor;
        closePop();
        if (a) a.focus({ preventScroll: true });
    };
    pop.querySelector('.t7-g').onclick = openSettings;
    pop.querySelector('.t7-q').addEventListener('input', filterGrid);
    gridMode = 'all';
    pop.querySelector('.t7-views').addEventListener('click', (e) => {
        const button = e.target.closest('[data-view]');
        if (!button || button.dataset.view === gridMode) return;
        gridMode = button.dataset.view;
        updateViewButtons();
        renderGrid();
    });

    const gr = pop.querySelector('.t7-gr');
    gr.addEventListener('click', (e) => {
        const favorite = e.target.closest('.t7-fav');
        if (favorite) {
            toggleFavorite(favorite.dataset.name);
            return;
        }
        const b = e.target.closest('.t7-it');
        if (b) {
            saveRecent(b.dataset.name);
            insertEmote(b.dataset.name);
            if (gridMode === 'recent') renderGrid();
        }
    });
    st.io = new IntersectionObserver(onVis, { root: gr, rootMargin: '120px' });

    document.body.appendChild(pop);
    renderGrid();
    place();
    document.addEventListener('keydown', onKey, true);
    addEventListener('resize', place);
}

export function togglePop(btn) {
    if (st.pop && st.anchor === btn) closePop();
    else { closePop(); openPop(btn); }
}