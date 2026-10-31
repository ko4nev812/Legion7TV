import { CACHE_TTL, EXTRA_EMOTES, EXTRA_SETS } from '../core/config.js';
import { S, EM, st } from '../core/state.js';
import { store } from '../core/store.js';
import { getJson } from '../network/net.js';
import { STORE } from '../core/consts.js';

function mk(host, flags, isGlobal, isExtra, meta = {}) {
    const files = (host.files || []).filter((f) => f.format === 'WEBP').map((f) => f.name);
    const owner = meta.owner || {};
    return {
        base: 'https:' + host.url,
        f: files.length ? files : ['1x.webp', '2x.webp'],
        zw: !!(flags & 256),   // zero-width эмоут
        g: isGlobal,
        id: String(meta.id || ''),
        owner: String(owner.display_name || owner.username || ''),
        animated: typeof meta.animated === 'boolean' ? meta.animated : null,
        ...(isExtra ? { x: true } : {})
    };
}

function addSet(map, set, isGlobal, isExtra) {
    for (const e of (set && set.emotes) || []) {
        const host = e.data && e.data.host;
        if (!host || !host.url || e.name === '__proto__') continue;
        map[e.name] = mk(host, e.data.flags, isGlobal, isExtra, {
            id: e.id || e.data.id,
            owner: e.data.owner,
            animated: e.data.animated
        });
    }
}

// один эмоут по ID (ответ /v3/emotes/<id>)
function addOne(map, em, alias) {
    const host = em && em.host;
    const name = String(alias || (em && em.name) || '');
    if (!host || !host.url || !name || /\s/.test(name) || name === '__proto__') return false;
    map[name] = mk(host, em.flags, true, true, {
        id: em.id,
        owner: em.owner,
        animated: em.animated
    });
    return true;
}

// подпись списка своих эмоутов: поменял список - кеш считается заново
const xsig = () => {
    const s = EXTRA_SETS.join(',') + '|' + EXTRA_EMOTES.map((e) => e.id + (e.name || '')).join(',');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
};

async function loadExtras() {
    const out = {};
    let bad = 0;
    const jobs = [
        ...EXTRA_SETS.map(async (id) => {
            const m = {};
            addSet(m, await getJson('https://7tv.io/v3/emote-sets/' + encodeURIComponent(id)), true, true);
            return m;
        }),
        ...EXTRA_EMOTES.map(async ({ id, name }) => {
            const m = {};
            if (!addOne(m, await getJson('https://7tv.io/v3/emotes/' + encodeURIComponent(id)), name))
                throw new Error('нет данных: ' + id);
            return m;
        })
    ];
    const res = await Promise.allSettled(jobs);
    for (const r of res) {
        if (r.status === 'fulfilled') Object.assign(out, r.value);   // порядок как в списке
        else { bad++; console.warn('[7TV] свои эмоуты', r.reason); }
    }
    return { map: out, bad };
}

// адрес файла нужного разрешения (n = 1..4)
export function urlFor(em, n) {
    let best = null;
    for (const f of em.f) {
        const l = parseInt(f, 10);
        if (l <= n && (best === null || l > parseInt(best, 10))) best = f;
    }
    return em.base + '/' + (best || em.f[0]);
}

export function reusableUrlsFor(em, n) {
    const target = urlFor(em, n);
    const targetSize = parseInt(target.slice(em.base.length + 1), 10);
    const higher = em.f.filter((f) => parseInt(f, 10) > targetSize)
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        .map((f) => em.base + '/' + f);
    return [target, ...higher];
}

async function loadEmotes(nick, force) {
    const key = STORE.emoteCachePrefix + nick + ':' + xsig();
    if (!force) {
        const c = store.get(key);
        if (c) return { map: c.map, msg: c.msg, stale: Date.now() - c.at >= CACHE_TTL };
    }
    const map = {};
    let err = '';
    try { addSet(map, await getJson('https://7tv.io/v3/emote-sets/global'), true, false); }
    catch (e) { err = 'глобальные не загрузились'; console.warn('[7TV]', e); }

    let chanMsg = '';
    if (!nick) {
        chanMsg = 'укажи ник стримера';
    } else {
        try {
            const u = await getJson('https://api.ivr.fi/v2/twitch/user?login=' + encodeURIComponent(nick));
            const id = u && u[0] && u[0].id;
            if (!id) chanMsg = 'Twitch-канал «' + nick + '» не найден';
            else {
                const user = await getJson('https://7tv.io/v3/users/twitch/' + id);
                const set = user && user.emote_set;
                if (set && set.emotes && set.emotes.length) addSet(map, set, false, false);
                else chanMsg = 'у канала нет эмоутов 7TV';
            }
        } catch (e) {
            chanMsg = 'эмоуты канала не загрузились (нет аккаунта 7TV или сервис недоступен)';
            console.warn('[7TV]', e);
        }
    }

    // свои эмоуты - в конце: при совпадении имён побеждают они
    let bad = 0;
    if (EXTRA_EMOTES.length || EXTRA_SETS.length) {
        const ex = await loadExtras();
        Object.assign(map, ex.map);
        bad = ex.bad;
    }

    const names = Object.keys(map);
    const nc = names.filter((n) => !map[n].g).length;
    const xc = names.filter((n) => map[n].x).length;
    let msg = `Канал: ${nc} · глобальные: ${names.length - nc - xc}`;
    if (xc || bad) msg += ` · свои: ${xc}${bad ? ' (не все загрузились: ' + bad + ')' : ''}`;
    if (chanMsg) msg += ' · ' + chanMsg;
    if (err) msg += ' · ' + err;
    if (names.length && !chanMsg && !err && !bad) store.set(key, { at: Date.now(), map, msg });
    return { map, msg, stale: false };
}

export function setStatus(t) {
    st.status = t;
    st.hooks.status(t);
}

export async function reload(force) {
    const my = ++st.loadToken;
    if (force) setStatus('Загрузка…');
    const { map, msg, stale } = await loadEmotes(S.nick, force);
    if (my !== st.loadToken) return;
    for (const k of Object.keys(EM)) delete EM[k];
    Object.assign(EM, map);
    setStatus(msg);
    st.hooks.emotes();            // перерисовать чат и список
    if (stale) reload(true);      // старый список уже показан, свежий подтянется фоном
}