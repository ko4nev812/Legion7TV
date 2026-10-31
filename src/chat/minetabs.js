// Единые настройки вкладок для отдельных чатов города и шахты.
import { pingSystem } from './pingSystem.js';
import { store } from '../core/store.js';
import { SAY_RE, sendWithLinks } from './links.js';
import { getChatTabPrefs } from './prefs.js';
import { EV, SEL, STORE, on } from '../core/consts.js';

const W = unsafeWindow;
const CITY = '/api/city/chat', MINE = '/api/mine/chat';
const PING_ONLY_KEY = STORE.pingOnly;
const PING_ARCHIVE_KEY = STORE.pingArchive;
const PING_ARCHIVE_LIMIT = 500;
const PING_PAGE_SIZE = 50;
let pingOnly = store.get(PING_ONLY_KEY) === true;
const storedPingArchive = store.get(PING_ARCHIVE_KEY) || {};
const cityPingArchive = Array.isArray(storedPingArchive.city) ? storedPingArchive.city.filter((m) => m && m.id != null) : [];
const minePingArchive = Array.isArray(storedPingArchive.mine) ? storedPingArchive.mine.filter((m) => m && m.id != null) : [];
const unifiedPingArchive = Array.isArray(storedPingArchive.one) ? storedPingArchive.one.filter((m) => m && m.id != null) : [];
const ROOM_IDS = ['city', 'mine', 'one'];
const createRoomState = (archive = []) => ({
    instance: null,
    pings: {},
    archive,
    archiveIds: new Set(archive.map((m) => String(m.id))),
    archivePage: 0,
    injectedPings: new Set(),
    filterObserver: null,
    filterList: null
});
const rooms = {
    city: createRoomState(cityPingArchive),
    mine: createRoomState(minePingArchive),
    one: createRoomState(unifiedPingArchive)
};
let pingArchiveSaveTimer = 0;

const hasUnifiedChat = () => !!rooms.one.instance;

pingSystem.subscribe(() => {
    for (const room of Object.values(rooms)) if (room.instance) room.instance.raw.render();
});

const tagMn = (m) => (m && m.tb !== 'mn' ? { ...m, tb: 'mn' } : m);
const tagMsg = (r) => (r && r.msg ? { ...r, msg: tagMn(r.msg) } : r);

function schedulePingArchiveSave() {
    clearTimeout(pingArchiveSaveTimer);
    pingArchiveSaveTimer = setTimeout(() => {
        pingArchiveSaveTimer = 0;
        store.set(PING_ARCHIVE_KEY, Object.fromEntries(ROOM_IDS.map((room) => [room, rooms[room].archive])));
    }, 500);
}
/* ---------- подписи и порядок вкладок ---------- */
function setupTabs(K) {
    const S = K.state();
    if (!S || !S.chat || !S.el) return;
    const C = S.chat;
    const tabs = S.el.querySelector(SEL.chatTabs);
    if (!tabs) return;
    const preferredTab = !K.one && K.base === MINE ? 'mn' : 'g';
    const otherCommonTab = preferredTab === 'g' ? 'mn' : 'g';
    const commonTab = tabs.querySelector(`[data-tab="${preferredTab}"]`)
        ? preferredTab
        : tabs.querySelector(`[data-tab="${otherCommonTab}"]`) ? otherCommonTab : preferredTab;
    const alternateTab = K.one ? null : commonTab === 'g' ? 'mn' : 'g';
    const prefId = (id) => !K.one && (id === 'g' || id === 'mn') ? 'g' : id;
    const siteId = (id) => id === 'g' ? commonTab : id;
    if (!K.one) {
        C[commonTab] = true;
        if (C.un && C.un[commonTab] == null) C.un[commonTab] = 0;
    }
    const prefs = getChatTabPrefs();
    for (const k of prefs.order) {
        const id = siteId(k);
        const e = tabs.querySelector(`[data-tab="${id}"]`);
        if (!e) continue;
        const legacyAlwaysAvailable = !K.one && id === commonTab;
        const shouldBeHidden = prefs.hidden.has(prefId(k)) || (!legacyAlwaysAvailable && !C[id]);
        e.hidden = shouldBeHidden;
        tabs.appendChild(e);
    }
    tabs.querySelectorAll('[data-tab]').forEach((b) => {
        if (alternateTab && b.dataset.tab === alternateTab) b.hidden = true;
        if (b._t7h) return;
        b._t7h = 1;
        // Библиотека сбрасывает hidden при рендере; восстанавливаем настройки и контекстную общую вкладку.
        new MutationObserver(() => {
            const hidden = getChatTabPrefs().hidden.has(prefId(b.dataset.tab));
            if (hidden || (alternateTab && b.dataset.tab === alternateTab)) {
                if (!b.hidden) b.hidden = true;
            } else if (b.dataset.tab === commonTab && !K.one && b.hidden) b.hidden = false;
        }).observe(b, { attributes: true, attributeFilter: ['hidden'] });
    });
    if (!K.one) {
        for (const id of ['g', 'mn']) {
            const button = tabs.querySelector(`[data-tab="${id}"]`);
            if (button && button.firstChild && button.firstChild.nodeType === 3) button.firstChild.nodeValue = 'Общий';
            if (button) button.title = 'Общие сообщения';
        }
    }
    if (prefs.hidden.has(prefId(C.tab))) {
        const fallback = prefs.order.find((id) => {
            const button = tabs.querySelector(`[data-tab="${siteId(id)}"]`);
            return !prefs.hidden.has(id) && button && !button.hidden;
        });
        if (fallback) selectTab(K, siteId(fallback));
    }
    if (!tabs._t7) {
        tabs._t7 = 1;
        // Библиотека может прятать ряд вкладок, если нет «Торговли» и «Личных».
        new MutationObserver(() => {
            const c = K.state() && K.state().chat;
            if (tabs.hidden && c && !c.panel) tabs.hidden = false;
        }).observe(tabs, { attributes: true, attributeFilter: ['hidden'] });
    }
    if (!C.panel) tabs.hidden = false;
}

on(EV.chatTabsChange, () => {
    for (const room of Object.values(rooms)) if (room.instance) setupTabs(room.instance.K);
});

function selectTab(K, t) {
    const S = K.state();
    const b = S && S.el && S.el.querySelector(`${SEL.chatTabs} [data-tab="${t}"]`);
    if (b) b.click();
}

const CHAT_JS = '/lib/site-chat.js';   // адрес проверь, см. ниже
let chatLoad = null;
function loadChatLib() {
    if (W.LGChat) return Promise.resolve();
    if (!chatLoad) chatLoad = new Promise((ok) => {
        const sc = document.createElement('script');
        sc.src = CHAT_JS;
        sc.onload = sc.onerror = () => ok();
        document.head.appendChild(sc);
    });
    return chatLoad;
}

/* ---------- параметры чата: флаги и маршрут отправки ---------- */
function patchK(K, room) {
    const cache = new WeakMap();
    const route = (api, p, b) => {
        const result = api(p, b);
        return room === 'mine' && p === K.say ? Promise.resolve(result).then(tagMsg) : result;
    };
    return {
        ...K,
        flags: room === 'mine' && !K.one ? () => {
            const x = K.X();
            const h = (x && x.hero && x.hero()) || {};
            return { on: K.flags(h).on, tr: !!h.ct, dm: !!h.cd };
        } : K.flags,
        X: () => {
            const x = K.X();
            if (!x) return x;
            let m = cache.get(x);
            if (!m) {
                const raw = (...a) => x.api(...a);
                const api = (p, b) => (SAY_RE.test(p) ? sendWithLinks(raw, p, b) : raw(p, b));
                m = new Proxy(x, {
                    get(t, k) {
                        if (k === 'api') return (p, b) => route(api, p, b);
                        const v = t[k];
                        return typeof v === 'function' ? v.bind(t) : v;
                    }
                });
                cache.set(x, m);
            }
            return m;
        }
    };
}

/* ---------- пинги (@ник): жёлтые кружки ---------- */
function chatOf(room) {
    const i = rooms[room].instance;
    const S = i && i.K.state();
    return S && S.chat ? { S, C: S.chat } : null;
}
function tabOfMsg(C, m) {   // как tabOf в чате сайта
    return m.tb || (m.rm === 'mine' ? 'mn' : m.ev ? (C.tr ? 'ev' : 'g') : m.k === 'tr' ? 'tr' : m.k === 'dm' ? 'dm' : 'g');
}
function isPingMessage(room, m, me) {
    const o = chatOf(room);
    if (!m || m.id == null || String(m.l || '').toLowerCase() === me || m.ev || m.sys) return false;
    if (o && o.C.ign && o.C.ign.has(m.l)) return false;
    if (pingSystem.shouldIgnore(m.l, m.t)) return false;
    return pingSystem.isPinged(m.t, me ? [me] : []);
}
function rememberPingMessages(room, msgs) {
    const roomState = rooms[room];
    const fallbackRoom = room === 'mine' ? 'city' : 'mine';
    const i = roomState.instance || rooms[fallbackRoom].instance;
    const x = i && i.K.X();
    const me = String((x && x.login && x.login()) || '').toLowerCase();
    const items = roomState.archive;
    const ids = roomState.archiveIds;
    let changed = false;
    for (const m of msgs || []) {
        if (!isPingMessage(room, m, me)) continue;
        const id = String(m.id);
        if (ids.has(id)) continue;
        items.push(m);
        ids.add(id);
        changed = true;
    }
    if (!changed) return;
    items.sort((a, b) => (a.at || 0) - (b.at || 0));
    while (items.length > PING_ARCHIVE_LIMIT) ids.delete(String(items.shift().id));
    schedulePingArchiveSave();
}
function stripArchivedPings(room) {
    const o = chatOf(room);
    const injected = rooms[room].injectedPings;
    if (o && o.C.list && injected.size) {
        const list = o.C.list.filter((m) => !injected.has(String(m.id)));
        o.C.list.splice(0, o.C.list.length, ...list);
    }
    injected.clear();
}
function archivePage(room, C) {
    const roomState = rooms[room];
    const messages = roomState.archive.filter((m) => tabOfMsg(C, m) === C.tab);
    const pageCount = Math.max(1, Math.ceil(messages.length / PING_PAGE_SIZE));
    roomState.archivePage = Math.min(roomState.archivePage, pageCount - 1);
    const end = messages.length - roomState.archivePage * PING_PAGE_SIZE;
    return messages.slice(Math.max(0, end - PING_PAGE_SIZE), end);
}
function syncPingArchive(room) {
    const o = chatOf(room);
    if (!o || !o.C.list) return false;
    const injected = rooms[room].injectedPings;
    const wanted = pingOnly ? archivePage(room, o.C) : [];
    const wantedIds = new Set(wanted.map((m) => String(m.id)));
    const presentIds = new Set(o.C.list.map((m) => String(m.id)));
    let changed = false;
    for (const id of injected) {
        if (wantedIds.has(id) && presentIds.has(id)) continue;
        const index = o.C.list.findIndex((m) => String(m.id) === id);
        if (index >= 0) {
            o.C.list.splice(index, 1);
            changed = true;
        }
        injected.delete(id);
    }
    for (const message of wanted) {
        const id = String(message.id);
        if (presentIds.has(id)) continue;
        o.C.list.push(message);
        injected.add(id);
        presentIds.add(id);
        changed = true;
    }
    if (changed) o.C.list.sort((a, b) => (a.at || 0) - (b.at || 0));
    return changed;
}
function refreshPingArchive(room) {
    const i = rooms[room].instance;
    if (!i) return;
    if (syncPingArchive(room)) i.raw.render();
    markFilteredMessages(room);
    applyPingOnly(room);
    updatePingArchiveControl(room);
}
function countPings(room, msgs) {
    const o = chatOf(room);
    if (!o) return;
    rememberPingMessages(room, msgs);
    const x = rooms[room].instance.K.X();
    const me = String((x && x.login && x.login()) || '').toLowerCase();
    const pg = rooms[room].pings;
    let hit = false;
    for (const m of msgs || []) {
        if (!m || String(m.l || '').toLowerCase() === me || m.ev || m.sys) continue;
        if (o.C.ign && o.C.ign.has(m.l)) continue;
        if (pingSystem.shouldIgnore(m.l, m.t)) continue;
        if (!pingSystem.isPinged(m.t, me ? [me] : [])) continue;
        const id = m.id == null ? '' : room + ':' + String(m.id);
        if (!id || !seenPings.has(id)) {
            pingSystem.play();
            if (id) {
                seenPings.add(id);
                if (seenPings.size > 500) seenPings.delete(seenPings.values().next().value);
            }
        }
        const tb = tabOfMsg(o.C, m);
        if (!o.C.on || (o.C.open && o.C.tab === tb)) continue;
        pg[tb] = (pg[tb] || 0) + 1;
        hit = true;
    }
    if (hit && o.C.on) paint(room);
}

const seenPings = new Set();
function markFilteredMessages(room) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector(SEL.chatList);
    if (!list || !o.C) return;
    const visible = o.C.list.filter((m) => tabOfMsg(o.C, m) === o.C.tab && !(o.C.ign && o.C.ign.has(m.l)) && (o.C.tab !== 'dm' || !o.C.peer || m.sys || m.l === o.C.peer || m.to === o.C.peer));
    const rows = list.querySelectorAll(SEL.nonEmptyChatRows);
    const x = rooms[room].instance.K.X();
    const me = String((x && x.login && x.login()) || '').toLowerCase();
    visible.forEach((m, index) => {
        const row = rows[index];
        if (!row) return;
        const label = pingSystem.filterLabel(m.l, m.t);
        row.classList.toggle('t7-filtered', !!label);
        row.classList.toggle('t7-filtered-blacklist', label === 'В ЧС');
        row.classList.toggle('ping', !label && pingSystem.isPinged(m.t, me ? [me] : []));
        let tag = row.querySelector(':scope > .t7-filter-label');
        if (!label) {
            if (tag) tag.remove();
            return;
        }
        if (!tag) {
            tag = document.createElement('i');
            tag.className = 't7-filter-label';
            row.prepend(tag);
        }
        tag.textContent = label === 'В ЧС' ? `Пользователь ${m.n || m.l} в чёрном списке` : 'Сообщение скрыто фильтром';
        tag.title = label === 'В ЧС' ? 'Отправитель в вашем черном списке' : 'В сообщении найдено слово или фраза из фильтра';
    });
}

function applyPingOnly(room) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector(SEL.chatList);
    if (!list) return;
    const visible = o.C.list.filter((m) => tabOfMsg(o.C, m) === o.C.tab && !(o.C.ign && o.C.ign.has(m.l)) && (o.C.tab !== 'dm' || !o.C.peer || m.sys || m.l === o.C.peer || m.to === o.C.peer));
    const pageIds = new Set(archivePage(room, o.C).map((m) => String(m.id)));
    let messageIndex = 0;
    let hasPing = false;
    list.querySelectorAll(':scope > li').forEach((row) => {
        if (row.classList.contains('cy-chat-0')) return;
        const message = visible[messageIndex++];
        const onPage = message && (message.id == null || pageIds.has(String(message.id)));
        const keep = !pingOnly || row.classList.contains('ping') && onPage;
        row.classList.toggle('t7-ping-hidden', !keep);
        if (pingOnly && keep) hasPing = true;
    });
    list.dataset.t7NoPings = String(pingOnly && !hasPing);
}

function syncPingOnlyControls() {
    for (const room of (hasUnifiedChat() ? ['one'] : ['city', 'mine'])) {
        const o = chatOf(room);
        const input = o && o.S.el && o.S.el.querySelector('.t7-chat-filter input');
        if (input) input.checked = pingOnly;
        refreshPingArchive(room);
        applyPingOnly(room);
        updatePingArchiveControl(room);
    }
}

function addPingOnlyControl(room, box) {
    const header = box.querySelector(SEL.chatHeader);
    if (!header) return;
    let label = header.querySelector('.t7-chat-filter');
    if (!label) {
        label = document.createElement('label');
        label.className = 't7-chat-filter';
        label.title = 'Показывать только сообщения с упоминанием';
        label.innerHTML = '<input type="checkbox"><span>Только пинги</span>';
        label.addEventListener('click', (e) => e.stopPropagation());
        label.querySelector('input').addEventListener('change', (e) => {
            pingOnly = e.currentTarget.checked;
            store.set(PING_ONLY_KEY, pingOnly);
            syncPingOnlyControls();
        });
    }
    label.querySelector('input').checked = pingOnly;
    const close = header.querySelector(SEL.chatCloseButton);
    if (!label.isConnected) header.insertBefore(label, close || null);

    let nav = header.querySelector('.t7-ping-nav');
    if (!nav) {
        nav = document.createElement('span');
        nav.className = 't7-ping-nav';
        nav.innerHTML = '<button type="button" data-direction="older" title="Показать более старые пинги" aria-label="Показать более старые пинги">‹</button><button type="button" data-direction="newer" title="Показать более новые пинги" aria-label="Показать более новые пинги">›</button>';
        nav.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-direction]');
            if (!button) return;
            e.stopPropagation();
            const roomState = rooms[room];
            roomState.archivePage = Math.max(0, roomState.archivePage + (button.dataset.direction === 'older' ? 1 : -1));
            refreshPingArchive(room);
            updatePingArchiveControl(room);
        });
        header.insertBefore(nav, close || null);
    }
    updatePingArchiveControl(room);
    applyPingOnly(room);
}
function updatePingArchiveControl(room) {
    const o = chatOf(room);
    const header = o && o.S.el && o.S.el.querySelector(SEL.chatHeader);
    const nav = header && header.querySelector('.t7-ping-nav');
    if (!nav || !o.C) return;
    const roomState = rooms[room];
    const count = roomState.archive.filter((m) => tabOfMsg(o.C, m) === o.C.tab).length;
    const pages = Math.ceil(count / PING_PAGE_SIZE);
    roomState.archivePage = Math.min(roomState.archivePage, Math.max(0, pages - 1));
    nav.hidden = !pingOnly || pages < 2;
    const older = nav.querySelector('[data-direction="older"]');
    const newer = nav.querySelector('[data-direction="newer"]');
    if (older) older.disabled = roomState.archivePage >= pages - 1;
    if (newer) newer.disabled = roomState.archivePage === 0;
}

const num = (n) => (n > 99 ? '99+' : String(n));
function badge(parent, cls, n, title) {
    let b = parent.querySelector(':scope > .' + cls);
    if (!b) {
        b = document.createElement('b');
        b.className = cls;
        parent.appendChild(b);
    }
    b.hidden = !n;
    b.textContent = n ? num(n) : '';
    b.title = n ? title + ': ' + n : '';
}
function paint(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector('.cy-chat');
    if (!box) return;
    const pg = rooms[room].pings;
    if (o.C.open) pg[o.C.tab] = 0;   // открытая вкладка прочитана
    let total = 0;
    box.querySelectorAll(SEL.chatTabButtons).forEach((b) => {
        const n = pg[b.dataset.tab] || 0;
        total += n;
        badge(b, 'cy-chat-tp', n, 'Упоминаний');
    });
    const t = box.querySelector(SEL.chatToggleButton);
    if (t) badge(t, 'cy-chat-pn', o.C.open ? 0 : total, 'Упоминаний');
}
function pingBind(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector(SEL.chatRoot);
    if (!box || box.dataset.t7pg) return;
    box.dataset.t7pg = '1';
    addPingOnlyControl(room, box);
    box.addEventListener('click', () => {
        refreshPingArchive(room);
        updatePingArchiveControl(room);
        paint(room);
    });   // вкладка / «Чат» / × → пересчитать
    const list = box.querySelector(SEL.chatList);
    if (list && !list.dataset.t7BlacklistMenu) {
        list.dataset.t7BlacklistMenu = '1';
        list.addEventListener('contextmenu', (e) => {
            const nick = e.target.closest(SEL.nickButton);
            if (!nick || !list.contains(nick)) return;
            const login = String(nick.dataset.nick || '').trim();
            if (!login) return;
            requestAnimationFrame(() => {
                const menu = document.querySelector('.cy-nm');
                if (!menu || menu.dataset.t7BlacklistAction) return;
                menu.dataset.t7BlacklistAction = '1';
                const blocked = pingSystem.config.blacklist.includes(login.toLowerCase());
                const action = document.createElement('button');
                action.type = 'button';
                action.setAttribute('role', 'menuitem');
                action.dataset.nm = 't7-blacklist';
                action.textContent = blocked ? 'Убрать из ЧС' : 'В чёрный список';
                action.addEventListener('click', () => pingSystem.toggleBlacklist(login));
                menu.appendChild(action);
            });
        }, true);
    }
    const roomState = rooms[room];
    if (list && roomState.filterList !== list) {
        if (roomState.filterObserver) roomState.filterObserver.disconnect();
        roomState.filterObserver = new MutationObserver(() => {
            markFilteredMessages(room);
            applyPingOnly(room);
        });
        roomState.filterObserver.observe(list, { childList: true });
        roomState.filterList = list;
    }
    markFilteredMessages(room);
    applyPingOnly(room);
    updatePingArchiveControl(room);
}

function wrapInst(raw, K, room) {
    const mine = room === 'mine';
    const unified = !!K.one;
    return {
        ...raw,
        init() { raw.init(); setupTabs(K); pingBind(room); },
        enter(r, rm) {
            if (unified) {
                raw.enter(r, rm);
                if (r && Array.isArray(r.chat)) rememberPingMessages(room, r.chat);
                rooms[room].pings = {};
                setupTabs(K);
                pingBind(room);
                paint(room);
                if (pingOnly) refreshPingArchive(room);
                return;
            }
            if (pingOnly) stripArchivedPings(room);
            const entered = r && Array.isArray(r.chat) && mine ? { ...r, chat: r.chat.map(tagMn) } : r;
            raw.enter(entered);
            rooms[room].injectedPings.clear();
            if (entered && Array.isArray(entered.chat)) rememberPingMessages(room, entered.chat);
            setupTabs(K);
            rooms[room].pings = {};
            pingBind(room);
            paint(room);
            selectTab(K, mine ? 'mn' : 'g');
            if (pingOnly) refreshPingArchive(room);
        },
        apply(d, rm) {
            if (unified) {
                raw.apply(d, rm);
                if (d && Array.isArray(d.chat)) countPings(room, d.chat);
                if (d && Array.isArray(d.chatDel)) {
                    const deleted = new Set(d.chatDel.map(String));
                    const archive = rooms[room];
                    const kept = archive.archive.filter((m) => !deleted.has(String(m.id)));
                    if (kept.length !== archive.archive.length) {
                        archive.archive = kept;
                        archive.archiveIds = new Set(kept.map((m) => String(m.id)));
                        schedulePingArchiveSave();
                    }
                }
                if (pingOnly) refreshPingArchive(room);
                return;
            }
            const own = d && Array.isArray(d.chat) && mine ? { ...d, chat: d.chat.map(tagMn) } : d;
            raw.apply(own);
            if (own && own.chat) countPings(room, own.chat);
            if (pingOnly) refreshPingArchive(room);
        }
    };
}

function wrapChat(v) {
    if (!v || v.__t7 || typeof v.make !== 'function') return v;
    const make = v.make;
    const w = {
        ...v,
        make(K) {
            const room = K && K.one ? 'one' : K && K.base === MINE ? 'mine' : K && K.base === CITY ? 'city' : null;
            if (!room) return make(K);
            const KK = patchK(K, room);
            const raw = make(KK);
            rooms[room].instance = { raw, K: KK };
            return wrapInst(raw, KK, room);
        }
    };
    w.__t7 = 1;
    return w;
}

/* ---------- обработка событий и удалений в пределах своей ленты ---------- */
function wrapCity(v) {
    if (!v || v.__t7 || typeof v.onEvent !== 'function') return v;
    const o = v.onEvent;
    v.onEvent = function (d) {
        try {
            if (d) {
                if (Array.isArray(d.chatDel) && d.chatDel.length) {
                    const deleted = new Set(d.chatDel.map(String));
                    let changed = false;
                    const archiveRoom = hasUnifiedChat() ? 'one' : 'city';
                    const archive = rooms[archiveRoom];
                    const kept = archive.archive.filter((m) => !deleted.has(String(m.id)));
                    if (kept.length !== archive.archive.length) {
                        archive.archive = kept;
                        archive.archiveIds = new Set(kept.map((m) => String(m.id)));
                        changed = true;
                    }
                    if (changed) schedulePingArchiveSave();
                }
            }
        } catch (e) { console.warn('[mine-tabs] city', e); }
        return o.apply(this, arguments);
    };
    v.__t7 = 1;
    return v;
}

function wrapMine(v) {
    if (!v || v.__t7) return v;
    const op = v.open;
    if (typeof op === 'function') {
        v.open = function () {
            if (W.LGChat) return op.apply(this, arguments);
            const args = arguments, self = this;
            loadChatLib().then(() => op.apply(self, args));   // шахта открывается, когда библиотека чата уже есть
        };
    }
    v.__t7 = 1;
    return v;
}

function wrapDm(v) {
    if (!v || v.__t7 || typeof v.init !== 'function') return v;
    const init = v.init;
    let lastContext = '';
    const wrapped = {
        ...v,
        init(ctx) {
            let context = '';
            try {
                context = `${String(ctx && ctx.me && ctx.me() || '').toLowerCase()}|${String(ctx && ctx.ch || '').toLowerCase()}`;
            } catch (e) {}
            const list = context && context === lastContext ? document.querySelector('.dm-l') : null;
            const scrollTop = list ? list.scrollTop : 0;
            const atEnd = list && list.scrollHeight - list.scrollTop - list.clientHeight < 40;
            let dmContext = ctx;
            if (ctx && typeof ctx.api === 'function') {
                const api = ctx.api.bind(ctx);
                dmContext = new Proxy(ctx, {
                    get(target, key) {
                        if (key === 'api') {
                            return (path, body) => SAY_RE.test(path)
                                ? sendWithLinks(api, path, body)
                                : api(path, body);
                        }
                        const value = Reflect.get(target, key, target);
                        return typeof value === 'function' ? value.bind(target) : value;
                    }
                });
            }
            const args = [...arguments];
            args[0] = dmContext;
            const result = init.apply(this, args);
            if (list && list.isConnected) list.scrollTop = atEnd ? list.scrollHeight : scrollTop;
            lastContext = context;
            return result;
        }
    };
    wrapped.__t7 = 1;
    return wrapped;
}

function hook(name, fn) {
    let val = W[name];
    if (val) val = fn(val);
    try {
        Object.defineProperty(W, name, {
            configurable: true, enumerable: true,
            get: () => val,
            set: (v) => { val = fn(v); }
        });
    } catch (e) { console.warn('[mine-tabs] hook', name, e); }
}

hook('LGChat', wrapChat);
hook('LGCity', wrapCity);
hook('LGMine', wrapMine);
hook('LGDm', wrapDm);