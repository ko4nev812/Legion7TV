// ==UserScript==
// @author       ProCto_Fliy
// @name         Legion chat extentions (7TV, более удобный чат и тд)
// @namespace    https://play.multidonate.ru/
// @version      4.6.0
// @description  Эмоуты 7TV в чате: кнопка 7TV, ник стримера, размер, список эмоутов, быстрый кеш
// @match        https://play.multidonate.ru/*
// @icon         https://cdn.7tv.app/emote/01F71VQYHR000D3ZZ6Q11NR7TV/2x.webp
// @homepageURL  https://github.com/ko4nev812/Legion7TV
// @updateURL    https://github.com/ko4nev812/Legion7TV/raw/refs/heads/main/7tv-multidonate.user.js
// @downloadURL  https://github.com/ko4nev812/Legion7TV/raw/refs/heads/main/7tv-multidonate.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// @connect      7tv.io
// @connect      cdn.7tv.app
// @connect      api.ivr.fi
// @connect      workers.dev
// @license      MIT
// ==/UserScript==
(() => {
  var styles_default = ".t7-w{display:inline-block;position:relative;vertical-align:middle;line-height:0}\n.t7-e{display:inline-block;vertical-align:middle;height:var(--t7-h,1.9em);width:auto;min-width:var(--t7-h,1.9em)}\n.t7-zw{position:absolute;left:50%;bottom:0;transform:translateX(-50%);height:100%;width:auto;pointer-events:none}\n.t7-e:not([src]),.t7-zw:not([src]){visibility:hidden}\n.t7-tip{\n    position:fixed;z-index:2147483646;display:flex;gap:12px;width:300px;max-width:calc(100vw - 16px);\n    padding:12px;border:1px solid rgba(255,255,255,.18);border-radius:10px;\n    background:#18181b;color:#efeff1;box-shadow:0 8px 28px rgba(0,0,0,.6);\n    font:13px/1.35 system-ui,sans-serif;pointer-events:none;box-sizing:border-box}\n.t7-tip[hidden]{display:none!important}\n.t7-tip-preview{\n    flex:none;display:flex;align-items:center;justify-content:center;width:104px;height:104px;padding:6px;\n    border-radius:8px;background:#0e0e10;box-sizing:border-box}\n.t7-tip-preview img{display:block;max-width:100%;max-height:100%;object-fit:contain}\n.t7-tip-preview img:not([src]),.t7-tip-loading{visibility:hidden}\n.t7-tip-info{min-width:0;display:flex;flex:1;flex-direction:column;justify-content:center;gap:8px}\n.t7-tip-name{font-size:16px;line-height:1.2;overflow-wrap:anywhere}\n.t7-tip-rows{display:flex;flex-direction:column;gap:3px}\n.t7-tip-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;color:#dedee3}\n.t7-tip-row>span:first-child{color:#adadb8}\n.t7-tip-row>span:last-child{overflow-wrap:anywhere}\n.t7-tip-id{font:11px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace}\nform.cy-chat-f .t7-btn{\n    flex:none;align-self:stretch;display:inline-flex;align-items:center;justify-content:center;\n    box-sizing:border-box;width:auto;height:auto;min-height:28px;margin:0 0 0 4px;padding:0 8px;\n    border:1px solid rgba(255,255,255,.25);border-radius:6px;background:rgba(145,70,255,.9);color:#fff;\n    font:700 11px/1 system-ui,sans-serif;letter-spacing:0;text-indent:0;text-transform:none;\n    white-space:nowrap;vertical-align:middle;cursor:pointer}\nform.cy-chat-f .t7-btn:hover{background:rgb(165,100,255)}\n.t7-pop,.t7-set{\n    --t7-bg:#1b1b24;--t7-bg-in:#0f0f15;--t7-fg:#eee;--t7-mute:#aaa;\n    --t7-line:rgba(255,255,255,.2);--t7-hover:rgba(255,255,255,.14);--t7-acc:#9146ff}\n.t7-pop *,.t7-set *{box-sizing:border-box}\n.t7-pop button,.t7-sw button{font:inherit;cursor:pointer}\n.t7-pop [hidden]{display:none!important}\n.t7-x,.t7-g{background:none;border:0;color:#ccc;line-height:1;border-radius:6px}\n.t7-x{font-size:20px;padding:0 4px}\n.t7-g{font-size:16px;padding:2px 5px}\n.t7-x:hover,.t7-g:hover{background:var(--t7-hover);color:#fff}\n.t7-pop{\n    position:fixed;z-index:2147483000;display:flex;flex-direction:column;gap:8px;\n    padding:10px;background:var(--t7-bg);color:var(--t7-fg);\n    border:1px solid rgba(255,255,255,.18);border-radius:10px;\n    box-shadow:0 8px 28px rgba(0,0,0,.55);font:13px/1.3 system-ui,sans-serif}\n.t7-pop.t7-drag{will-change:transform;transition:none}\n.t7-pop.t7-drag .t7-gr{pointer-events:none}\n.t7-h,.t7-sth{display:flex;justify-content:space-between;align-items:center;\n    font-size:15px;cursor:grab;touch-action:none;user-select:none}\n.t7-h:active,.t7-sth:active{cursor:grabbing}\n.t7-hb{display:flex;align-items:center;gap:2px}\n.t7-pop input[type=search]{\n    width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--t7-line);\n    background:var(--t7-bg-in);color:#fff;font:13px system-ui,sans-serif}\n.t7-views{display:flex;gap:3px;padding:2px;border:1px solid var(--t7-line);border-radius:6px;background:var(--t7-bg-in)}\n.t7-views button{flex:1;padding:5px 7px;border:0;border-radius:4px;background:transparent;color:var(--t7-mute);font-size:12px}\n.t7-views button[aria-selected=true]{background:var(--t7-hover);color:var(--t7-fg)}\n.t7-gr{flex:1;min-height:156px;overflow-y:auto;overscroll-behavior:contain}\n.t7-sh{margin:6px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--t7-mute)}\n.t7-gw{display:flex;flex-wrap:wrap;gap:2px}\n.t7-it{display:inline-flex;align-items:center;justify-content:center;\n    width:var(--t7-tile,40px);height:var(--t7-tile,40px);padding:3px;border:0;border-radius:6px;background:transparent}\n.t7-it:hover,.t7-it:focus-visible{background:var(--t7-hover)}\n.t7-it img{width:100%;height:100%;object-fit:contain}\n.t7-item{position:relative;flex:none;width:var(--t7-tile,40px);height:var(--t7-tile,40px)}\n.t7-item .t7-it{width:100%;height:100%}\n.t7-fav{position:absolute;top:0;right:0;z-index:1;display:grid;place-items:center;width:17px;height:17px;padding:0;border:0;border-radius:4px;background:rgba(15,15,21,.82);color:#e5c76b;font:14px/1 system-ui,sans-serif;opacity:.78}\n.t7-fav:hover,.t7-fav:focus-visible{opacity:1;background:var(--t7-hover)}\n.t7-emp{padding:16px 4px;color:var(--t7-mute);text-align:center}\n.t7-rs{position:absolute;right:0;bottom:0;width:20px;height:20px;cursor:nwse-resize;touch-action:none;\n    border-radius:0 0 10px 0;\n    background:linear-gradient(135deg,transparent 0 55%,#888 55% 62%,transparent 62% 72%,#888 72% 79%,transparent 79%)}\n.t7-set{\n    position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;\n    padding:12px;background:rgba(0,0,0,.5);font:13px/1.3 system-ui,sans-serif}\n.t7-sw{\n    width:380px;max-width:100%;max-height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:16px;\n    padding:14px;background:var(--t7-bg);color:var(--t7-fg);\n    border:1px solid rgba(255,255,255,.18);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.6)}\n.t7-sw.t7-drag{will-change:transform}\n.t7-sec{display:flex;flex-direction:column;gap:6px}\n.t7-sec>h4{margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--t7-mute)}\n.t7-row{display:flex;gap:6px;align-items:flex-end}\n.t7-wrap{flex-wrap:wrap}\n.t7-fl{flex:1;display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--t7-mute)}\n.t7-chk{display:flex;gap:8px;align-items:center;cursor:pointer}\n.t7-sst{min-height:1.3em;font-size:11px;color:var(--t7-mute)}\n.t7-sw input[type=text],.t7-sw input[type=number]{\n    width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--t7-line);\n    background:var(--t7-bg-in);color:#fff;font:13px system-ui,sans-serif}\n.t7-sw textarea,.t7-sw select{\n    width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--t7-line);\n    background:var(--t7-bg-in);color:#fff;font:13px system-ui,sans-serif}\n.t7-sw textarea{resize:vertical;min-height:44px}\n.t7-volume{display:grid;grid-template-columns:1fr auto;align-items:center;column-gap:8px}\n.t7-volume input{grid-column:1/-1;width:100%;margin:2px 0}\n.t7-volume output,.t7-ping-status{font-size:11px;color:var(--t7-mute)}\n.t7-ping-status{min-height:1.3em}\n.t7-b{padding:6px 10px;border-radius:6px;border:1px solid var(--t7-line);background:var(--t7-bg-in);color:#ddd}\n.t7-b:hover{background:#1d1d29}\n.t7-b.p{background:var(--t7-acc);border-color:var(--t7-acc);color:#fff}\n.t7-szb{display:flex;gap:4px}\n.t7-szb button{min-width:34px;padding:4px 8px;border-radius:6px;border:1px solid var(--t7-line);background:var(--t7-bg-in);color:#ddd}\n.t7-szb button[aria-pressed=true]{background:var(--t7-acc);border-color:var(--t7-acc);color:#fff}\n.cy-chat-tabs:not([hidden]){\n    display:flex;flex-wrap:nowrap;gap:2px;width:100%;max-width:100%;min-width:0;box-sizing:border-box;\n    overflow-x:auto;overflow-y:hidden;scrollbar-width:none}\n.cy-chat-tabs::-webkit-scrollbar{display:none}\n.cy-chat-tabs>button[data-tab]{\n    flex:0 0 auto;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:3px;\n    padding:5px 6px;font-size:11px;line-height:1.2;white-space:nowrap;overflow:visible}\n.cy-chat-tabs>button .cy-chat-tn{flex:none;margin:0;min-width:1.5em;padding:1px 4px;line-height:1.3;text-align:center;overflow:visible}\n.cy-chat .cy-chat-n,\n.cy-chat .cy-chat-tn,\n.cy-chat .cy-chat-tp,\n.cy-chat .cy-chat-pn{\n    flex:none;display:inline-block;box-sizing:border-box;min-width:18px;height:18px;margin:0 0 0 4px;padding:0 5px;\n    border-radius:9px;font:700 11px/18px system-ui,sans-serif;text-align:center;text-indent:0;overflow:visible}\n.cy-chat .cy-chat-n,\n.cy-chat .cy-chat-tn{background:#e53935;color:#fff}\n.cy-chat .cy-chat-tp,\n.cy-chat .cy-chat-pn{background:#ffc94d;color:#1b1b24}\n.cy-chat .cy-chat-n[hidden],\n.cy-chat .cy-chat-tn[hidden],\n.cy-chat .cy-chat-tp[hidden],\n.cy-chat .cy-chat-pn[hidden]{display:none!important}\n.cy-chat-l>li.t7-filtered{font-style:italic}\n.cy-chat-l>li>.t7-filter-label{display:inline-block;margin-right:5px;padding:2px 6px;border-radius:4px;background:rgba(255,201,77,.14);color:#ffca66;font-size:13px;font-weight:700;white-space:nowrap}\n.cy-chat-l>li.t7-filtered>:not(.t7-filter-label){display:none!important}";
  var CACHE_TTL = 60 * 60 * 1e3;
  var SIZES = {
    s: { h: "1.3em", n: 2, p: 32, label: "S" },
    m: { h: "1.9em", n: 2, p: 40, label: "M" },
    l: { h: "2.6em", n: 3, p: 52, label: "L" },
    x: { h: "3.4em", n: 3, p: 68, label: "XL" }
  };
  var pageChan = (() => {
    const m = /\/c\/([\w]+)/.exec(location.pathname);
    return m ? m[1].toLowerCase() : "";
  })();
  var EXTRA_EMOTES = [
    { id: "01KPTZTF2P1MP5RFNJ4Q1ZQZS6" }
  ];
  var EXTRA_SETS = [
  ];
  var S = { nick: pageChan, size: "m", on: true };
  var EM = {};
  var st = {
    pos: null,
    win: null,
    pop: null,
    anchor: null,
    io: null,
    visibleIo: null,
    status: "",
    loadToken: 0,
    hooks: {
      status() {
      },
      emotes() {
      },
      place() {
      }
    }
  };
  var store = {
    get: (k) => {
      try {
        return GM_getValue(k, void 0);
      } catch {
        return void 0;
      }
    },
    set: (k, v) => {
      try {
        GM_setValue(k, v);
      } catch {
      }
    }
  };
  var ALLOWED = ["7tv.io", "cdn.7tv.app", "api.ivr.fi"];
  var ROUTES = { "7tv.io": "api", "cdn.7tv.app": "cdn", "api.ivr.fi": "ivr" };
  var DEFAULT_PROXY = "";
  var normProxy = (v) => {
    v = String(v || "").trim().replace(/\/+$/, "");
    try {
      const u = new URL(v);
      return u.protocol === "https:" ? u.origin : "";
    } catch {
      return "";
    }
  };
  var proxy = (() => {
    const v = store.get("t7proxy");
    return normProxy(typeof v === "string" ? v : DEFAULT_PROXY);
  })();
  var proxyDownUntil = 0;
  var urlOk = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === "https:" && ALLOWED.includes(u.hostname);
    } catch {
      return false;
    }
  };
  function viaProxy(url) {
    const u = new URL(url);
    return `${proxy}/${ROUTES[u.hostname]}${u.pathname}${u.search}`;
  }
  var gmOnce = (url, responseType, timeout) => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType,
      timeout,
      onload: (r) => r.status >= 200 && r.status < 300 ? resolve(r) : reject(new Error(url + " -> " + r.status)),
      onerror: reject,
      ontimeout: reject
    });
  });
  var gm = async (url, responseType) => {
    if (!urlOk(url)) throw new Error("url not allowed");
    if (proxy && Date.now() > proxyDownUntil) {
      try {
        return await gmOnce(viaProxy(url), responseType, 6e3);
      } catch {
        proxyDownUntil = Date.now() + 12e4;
      }
    }
    return gmOnce(url, responseType, 15e3);
  };
  var getJson = async (url) => JSON.parse((await gm(url)).responseText);
  var getBuf = async (url) => {
    const r = await gm(url, "blob");
    const type = r.response && r.response.type || "image/webp";
    const buf2 = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsArrayBuffer(r.response);
    });
    return new Blob([buf2], { type });
  };
  function mk(host, flags, isGlobal, isExtra, meta = {}) {
    const files = (host.files || []).filter((f) => f.format === "WEBP").map((f) => f.name);
    const owner = meta.owner || {};
    return {
      base: "https:" + host.url,
      f: files.length ? files : ["1x.webp", "2x.webp"],
      zw: !!(flags & 256),
      g: isGlobal,
      id: String(meta.id || ""),
      owner: String(owner.display_name || owner.username || ""),
      animated: typeof meta.animated === "boolean" ? meta.animated : null,
      ...isExtra ? { x: true } : {}
    };
  }
  function addSet(map, set, isGlobal, isExtra) {
    for (const e of set && set.emotes || []) {
      const host = e.data && e.data.host;
      if (!host || !host.url || e.name === "__proto__") continue;
      map[e.name] = mk(host, e.data.flags, isGlobal, isExtra, {
        id: e.id || e.data.id,
        owner: e.data.owner,
        animated: e.data.animated
      });
    }
  }
  function addOne(map, em, alias) {
    const host = em && em.host;
    const name = String(alias || em && em.name || "");
    if (!host || !host.url || !name || /\s/.test(name) || name === "__proto__") return false;
    map[name] = mk(host, em.flags, true, true, {
      id: em.id,
      owner: em.owner,
      animated: em.animated
    });
    return true;
  }
  var xsig = () => {
    const s = EXTRA_SETS.join(",") + "|" + EXTRA_EMOTES.map((e) => e.id + (e.name || "")).join(",");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0;
    return (h >>> 0).toString(36);
  };
  async function loadExtras() {
    const out = {};
    let bad = 0;
    const jobs = [
      ...EXTRA_SETS.map(async (id) => {
        const m = {};
        addSet(m, await getJson("https://7tv.io/v3/emote-sets/" + encodeURIComponent(id)), true, true);
        return m;
      }),
      ...EXTRA_EMOTES.map(async ({ id, name }) => {
        const m = {};
        if (!addOne(m, await getJson("https://7tv.io/v3/emotes/" + encodeURIComponent(id)), name))
          throw new Error("\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445: " + id);
        return m;
      })
    ];
    const res = await Promise.allSettled(jobs);
    for (const r of res) {
      if (r.status === "fulfilled") Object.assign(out, r.value);
      else {
        bad++;
        console.warn("[7TV] \u0441\u0432\u043E\u0438 \u044D\u043C\u043E\u0443\u0442\u044B", r.reason);
      }
    }
    return { map: out, bad };
  }
  function urlFor(em, n) {
    let best = null;
    for (const f of em.f) {
      const l = parseInt(f, 10);
      if (l <= n && (best === null || l > parseInt(best, 10))) best = f;
    }
    return em.base + "/" + (best || em.f[0]);
  }
  async function loadEmotes(nick, force) {
    const key = "t7c3:" + nick + ":" + xsig();
    if (!force) {
      const c = store.get(key);
      if (c) return { map: c.map, msg: c.msg, stale: Date.now() - c.at >= CACHE_TTL };
    }
    const globalJob = (async () => {
      const map2 = {};
      try {
        addSet(map2, await getJson("https://7tv.io/v3/emote-sets/global"), true, false);
        return { map: map2, err: "" };
      } catch (e) {
        console.warn("[7TV]", e);
        return { map: map2, err: "\u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C" };
      }
    })();
    const channelJob = (async () => {
      const map2 = {};
      if (!nick) return { map: map2, msg: "\u0443\u043A\u0430\u0436\u0438 \u043D\u0438\u043A \u0441\u0442\u0440\u0438\u043C\u0435\u0440\u0430" };
      try {
        const u = await getJson("https://api.ivr.fi/v2/twitch/user?login=" + encodeURIComponent(nick));
        const id = u && u[0] && u[0].id;
        if (!id) return { map: map2, msg: "Twitch-\u043A\u0430\u043D\u0430\u043B \xAB" + nick + "\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" };
        const user = await getJson("https://7tv.io/v3/users/twitch/" + id);
        const set = user && user.emote_set;
        if (set && set.emotes && set.emotes.length) {
          addSet(map2, set, false, false);
          return { map: map2, msg: "" };
        }
        return { map: map2, msg: "\u0443 \u043A\u0430\u043D\u0430\u043B\u0430 \u043D\u0435\u0442 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 7TV" };
      } catch (e) {
        console.warn("[7TV]", e);
        return { map: map2, msg: "\u044D\u043C\u043E\u0443\u0442\u044B \u043A\u0430\u043D\u0430\u043B\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C (\u043D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 7TV \u0438\u043B\u0438 \u0441\u0435\u0440\u0432\u0438\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D)" };
      }
    })();
    const extrasJob = EXTRA_EMOTES.length || EXTRA_SETS.length ? loadExtras() : Promise.resolve({ map: {}, bad: 0 });
    const [global, channel, extras] = await Promise.all([globalJob, channelJob, extrasJob]);
    const map = Object.assign({}, global.map, channel.map, extras.map);
    const err = global.err;
    const chanMsg = channel.msg;
    const bad = extras.bad;
    const names = Object.keys(map);
    const nc = names.filter((n) => !map[n].g).length;
    const xc = names.filter((n) => map[n].x).length;
    let msg = `\u041A\u0430\u043D\u0430\u043B: ${nc} \xB7 \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435: ${names.length - nc - xc}`;
    if (xc || bad) msg += ` \xB7 \u0441\u0432\u043E\u0438: ${xc}${bad ? " (\u043D\u0435 \u0432\u0441\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C: " + bad + ")" : ""}`;
    if (chanMsg) msg += " \xB7 " + chanMsg;
    if (err) msg += " \xB7 " + err;
    if (names.length && !chanMsg && !err && !bad) store.set(key, { at: Date.now(), map, msg });
    return { map, msg, stale: false };
  }
  function setStatus(t) {
    st.status = t;
    st.hooks.status(t);
  }
  async function reload(force) {
    const my = ++st.loadToken;
    if (force) setStatus("\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026");
    const { map, msg, stale } = await loadEmotes(S.nick, force);
    if (my !== st.loadToken) return;
    for (const k of Object.keys(EM)) delete EM[k];
    Object.assign(EM, map);
    setStatus(msg);
    st.hooks.emotes();
    if (stale) reload(true);
  }
  var clamp = (v, a, b) => Math.max(a, Math.min(v, b));
  var has = (m, k) => Object.prototype.hasOwnProperty.call(m, k);
  function parseNick(v) {
    v = String(v || "").trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
    const i = v.lastIndexOf("/");
    if (i >= 0) v = v.slice(i + 1);
    v = v.replace(/^@/, "");
    return /^[a-z0-9_]{1,25}$/.test(v) ? v : "";
  }
  var DB = /* @__PURE__ */ (() => {
    let p;
    const open = () => p || (p = new Promise((res) => {
      try {
        const r = indexedDB.open("t7img", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("i");
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch {
        res(null);
      }
    }));
    const tx = async (mode, fn) => {
      const db = await open();
      if (!db) return void 0;
      return new Promise((res) => {
        try {
          const t = db.transaction("i", mode);
          const rq = fn(t.objectStore("i"));
          t.oncomplete = () => res(rq && rq.result);
          t.onerror = t.onabort = () => res(void 0);
        } catch {
          res(void 0);
        }
      });
    };
    return {
      get: (k) => tx("readonly", (s) => s.get(k)),
      set: (k, v) => tx("readwrite", (s) => s.put(v, k)),
      clear: () => tx("readwrite", (s) => s.clear())
    };
  })();
  var Q = { wait: [], run: 0, running: [0, 0, 0], max: 10, next: 0 };
  var limitFor = (priority) => priority === 0 ? 4 : priority === 1 ? 8 : Q.max;
  function pump() {
    while (Q.run < Q.max) {
      let best = -1;
      for (let i = 0; i < Q.wait.length; i++) {
        const a = Q.wait[i], b = Q.wait[best];
        if (best < 0 || a.priority > b.priority || a.priority === b.priority && a.order < b.order) best = i;
      }
      if (best < 0) return;
      const j = Q.wait[best];
      if (Q.run >= limitFor(j.priority)) return;
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
  var priorityOf = (value) => typeof value === "number" ? Math.max(0, Math.min(2, Math.round(value))) : value ? 2 : 0;
  var imgCache = /* @__PURE__ */ new Map();
  function fetchImg(url, priority) {
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
  async function clearImgs() {
    imgCache.clear();
    await DB.clear();
  }
  var tooltipData = /* @__PURE__ */ new WeakMap();
  var tooltip = null;
  var current = null;
  var initialized = false;
  var imageToken = 0;
  function setEmoteTooltipData(element, name, emote) {
    if (element && emote) tooltipData.set(element, { name, emote });
  }
  function findTarget(node) {
    const element = node instanceof Element ? node.closest(".t7-e,.t7-it") : null;
    return element && tooltipData.has(element) ? element : null;
  }
  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.className = "t7-tip";
    tooltip.id = "t7-emote-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    tooltip.innerHTML = '<div class="t7-tip-preview"><img alt=""></div><div class="t7-tip-info"><strong class="t7-tip-name"></strong><div class="t7-tip-rows"></div></div>';
    document.body.appendChild(tooltip);
    return tooltip;
  }
  function addRow(rows, label, value, className = "") {
    if (!value) return;
    const row = document.createElement("div");
    row.className = "t7-tip-row";
    const key = document.createElement("span");
    key.textContent = label;
    const content = document.createElement("span");
    content.textContent = value;
    if (className) content.className = className;
    row.append(key, content);
    rows.appendChild(row);
  }
  function sourceName(emote) {
    if (emote.x) return "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0439";
    return emote.g ? "\u0413\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0439 7TV" : "\u041A\u0430\u043D\u0430\u043B 7TV";
  }
  function position(clientX, clientY) {
    if (!tooltip || tooltip.hidden) return;
    const gap = 14;
    const margin = 8;
    const rect = tooltip.getBoundingClientRect();
    let left = clientX + gap;
    let top = clientY + gap;
    if (left + rect.width > innerWidth - margin) left = clientX - rect.width - gap;
    if (top + rect.height > innerHeight - margin) top = clientY - rect.height - gap;
    tooltip.style.left = Math.max(margin, left) + "px";
    tooltip.style.top = Math.max(margin, top) + "px";
  }
  function show(target, clientX, clientY) {
    const data = tooltipData.get(target);
    if (!data) return;
    if (current && current !== target) current.removeAttribute("aria-describedby");
    current = target;
    const tip = ensureTooltip();
    const { name, emote } = data;
    tip.querySelector(".t7-tip-name").textContent = name;
    const rows = tip.querySelector(".t7-tip-rows");
    rows.textContent = "";
    addRow(rows, "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A", sourceName(emote));
    addRow(rows, "\u0410\u0432\u0442\u043E\u0440", emote.owner);
    if (emote.animated !== null && emote.animated !== void 0)
      addRow(rows, "\u0422\u0438\u043F", emote.animated ? "\u0410\u043D\u0438\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439" : "\u0421\u0442\u0430\u0442\u0438\u0447\u043D\u044B\u0439");
    if (emote.zw) addRow(rows, "\u041D\u0430\u043B\u043E\u0436\u0435\u043D\u0438\u0435", "Zero-width");
    addRow(rows, "ID", emote.id, "t7-tip-id");
    const image = tip.querySelector("img");
    const token = ++imageToken;
    image.removeAttribute("src");
    image.classList.add("t7-tip-loading");
    tip.hidden = false;
    target.setAttribute("aria-describedby", tip.id);
    position(clientX, clientY);
    fetchImg(urlFor(emote, 4), true).then((src) => {
      if (current !== target || token !== imageToken) return;
      image.src = src;
      image.classList.remove("t7-tip-loading");
    }, () => {
      if (current === target && token === imageToken) image.classList.remove("t7-tip-loading");
    });
  }
  function hide() {
    if (current) current.removeAttribute("aria-describedby");
    current = null;
    imageToken++;
    if (tooltip) tooltip.hidden = true;
  }
  function initEmoteTooltip() {
    if (initialized) return;
    initialized = true;
    document.addEventListener("mouseover", (event) => {
      const target = findTarget(event.target);
      if (!target || target === current) return;
      show(target, event.clientX, event.clientY);
    });
    document.addEventListener("mousemove", (event) => {
      if (current) position(event.clientX, event.clientY);
    });
    document.addEventListener("mouseout", (event) => {
      if (!current) return;
      const next = findTarget(event.relatedTarget);
      if (next === current) return;
      hide();
    });
    document.addEventListener("focusin", (event) => {
      const target = findTarget(event.target);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      show(target, rect.right, rect.bottom);
    });
    document.addEventListener("focusout", (event) => {
      if (current === findTarget(event.target)) hide();
    });
  }
  document.addEventListener("scroll", (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains("cy-chat-l"))
      t.dataset.t7end = t.scrollHeight - t.scrollTop - t.clientHeight < 40 ? "1" : "0";
  }, true);
  function stickEnds() {
    document.querySelectorAll(".cy-chat-l").forEach((l) => {
      if (l.dataset.t7end !== "0") l.scrollTop = l.scrollHeight;
    });
  }
  function stickFrom(el) {
    const l = el.closest && el.closest(".cy-chat-l");
    if (l && l.dataset.t7end !== "0") l.scrollTop = l.scrollHeight;
  }
  function makeImg(name, em, cls) {
    const img = document.createElement("img");
    img.className = cls;
    img.alt = name;
    setEmoteTooltipData(img, name, em);
    img.addEventListener("load", () => stickFrom(img));
    fetchImg(urlFor(em, SIZES[S.size].n), true).then(
      (d) => {
        img.src = d;
      },
      (e) => {
        console.warn("[7TV] \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C", name, e);
        img.replaceWith(document.createTextNode(name));
      }
    );
    return img;
  }
  var NONE = {};
  function processSpan(sp) {
    const act = S.on ? EM : NONE;
    const src = sp.dataset.t7o != null ? sp.dataset.t7o : sp.textContent;
    const parts = src.split(/(\s+)/);
    if (!parts.some((p) => has(act, p))) {
      if (sp.dataset.t7o != null) {
        sp.textContent = src;
        delete sp.dataset.t7o;
      }
      return;
    }
    sp.dataset.t7o = src;
    const frag = document.createDocumentFragment();
    let lastWrap = null;
    for (const p of parts) {
      const em = has(EM, p) ? EM[p] : null;
      if (em && em.zw && lastWrap) {
        lastWrap.appendChild(makeImg(p, em, "t7-zw"));
        continue;
      }
      if (em) {
        const w = document.createElement("span");
        w.className = "t7-w";
        w.appendChild(makeImg(p, em, "t7-e"));
        frag.appendChild(w);
        lastWrap = w;
        continue;
      }
      if (/^\s+$/.test(p)) {
        if (lastWrap) {
          frag.appendChild(document.createTextNode(p));
          continue;
        }
      } else if (p) {
        lastWrap = null;
      }
      if (p) frag.appendChild(document.createTextNode(p));
    }
    sp.textContent = "";
    sp.appendChild(frag);
  }
  function processLi(li) {
    if (li.dataset.t7) return;
    li.dataset.t7 = "1";
    if (li.classList.contains("cy-chat-sys") || li.classList.contains("cy-chat-ev") || li.classList.contains("cy-chat-0")) return;
    const spans = li.querySelectorAll(":scope > span:not([class])");
    const sp = spans[spans.length - 1];
    if (sp) processSpan(sp);
  }
  function scan() {
    const fresh = document.querySelectorAll(".cy-chat-l li:not([data-t7])");
    if (!fresh.length) return;
    fresh.forEach(processLi);
    stickEnds();
  }
  function rescanAll() {
    document.querySelectorAll(".cy-chat-l li[data-t7]").forEach((li) => {
      delete li.dataset.t7;
    });
    scan();
  }
  var applySize = () => {
    document.documentElement.style.setProperty("--t7-h", SIZES[S.size].h);
    document.documentElement.style.setProperty("--t7-tile", SIZES[S.size].p + "px");
  };
  var KEY = "t7ping";
  var PRESETS = /* @__PURE__ */ new Set(["bell", "chime", "pop", "custom"]);
  var DEFAULTS = {
    volume: 0.5,
    selectedPreset: "bell",
    customSound: "",
    aliases: [],
    blacklist: [],
    stopWords: []
  };
  function readConfig() {
    const saved = store.get(KEY);
    const config = { ...DEFAULTS, ...saved && typeof saved === "object" ? saved : {} };
    config.volume = Number.isFinite(config.volume) ? Math.max(0, Math.min(1, config.volume)) : DEFAULTS.volume;
    config.selectedPreset = PRESETS.has(config.selectedPreset) ? config.selectedPreset : DEFAULTS.selectedPreset;
    config.customSound = typeof config.customSound === "string" && config.customSound.startsWith("data:audio/") ? config.customSound : "";
    for (const key of ["aliases", "blacklist", "stopWords"]) {
      config[key] = Array.isArray(config[key]) ? normalizeList(config[key].join("\n")) : [];
    }
    return config;
  }
  function normalizeList(value) {
    return String(value || "").split(/[\n,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
  }
  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  var PingSystem = class {
    constructor() {
      this.config = readConfig();
      this.audioContext = null;
      this.customBuffer = null;
      this.customBufferPromise = null;
    }
    save() {
      store.set(KEY, this.config);
    }
    setList(key, value) {
      if (!["aliases", "blacklist", "stopWords"].includes(key)) return;
      this.config[key] = normalizeList(value);
      this.save();
      if (this.onChange) this.onChange();
    }
    setVolume(value) {
      this.config.volume = Math.max(0, Math.min(1, Number(value) || 0));
      this.save();
    }
    setPreset(value) {
      if (!PRESETS.has(value) || value === "custom" && !this.config.customSound) return;
      this.config.selectedPreset = value;
      this.save();
    }
    saveCustomSound(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("audio/")) return reject(new Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B"));
        if (file.size > 2 * 1024 * 1024) return reject(new Error("\u0420\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 2 \u041C\u0411"));
        const reader = new FileReader();
        reader.onload = () => {
          this.config.customSound = String(reader.result || "");
          this.config.selectedPreset = "custom";
          this.customBuffer = null;
          this.customBufferPromise = null;
          this.save();
          resolve();
        };
        reader.onerror = () => reject(new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B"));
        reader.readAsDataURL(file);
      });
    }
    isPinged(messageText, extraAliases = []) {
      const text = String(messageText || "");
      return [...this.config.aliases, ...extraAliases].some((raw) => {
        const alias = String(raw || "").trim().toLowerCase();
        if (!alias) return false;
        const pattern = new RegExp("(^|[^\\p{L}\\p{N}_])" + escapeRegex(alias) + "(?=$|[^\\p{L}\\p{N}_])", "iu");
        return pattern.test(text);
      });
    }
    filterLabel(sender, messageText) {
      const user = String(sender || "").toLowerCase();
      const text = String(messageText || "").toLowerCase();
      if (this.config.blacklist.includes(user)) return "\u0412 \u0427\u0421";
      if (this.config.stopWords.some((word) => text.includes(word))) return "\u0424\u0438\u043B\u044C\u0442\u0440";
      return "";
    }
    shouldIgnore(sender, messageText) {
      return !!this.filterLabel(sender, messageText);
    }
    getAudioContext() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.audioContext ||= new AudioContext();
      return this.audioContext;
    }
    unlockAudio() {
      try {
        const context = this.getAudioContext();
        if (context && context.state === "suspended") context.resume();
      } catch (error) {
        console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u043E", error);
      }
    }
    async loadCustomBuffer(context) {
      if (this.customBuffer) return this.customBuffer;
      if (!this.customBufferPromise) {
        this.customBufferPromise = (async () => {
          const encoded = this.config.customSound.split(",")[1];
          if (!encoded) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B");
          const binary = atob(encoded);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return context.decodeAudioData(bytes.buffer);
        })();
      }
      this.customBuffer = await this.customBufferPromise;
      return this.customBuffer;
    }
    async play() {
      if (this.config.volume <= 0) return;
      const context = this.getAudioContext();
      if (!context) return;
      if (context.state === "suspended") await context.resume();
      if (this.config.selectedPreset === "custom" && this.config.customSound) {
        try {
          const source = context.createBufferSource();
          const gain = context.createGain();
          source.buffer = await this.loadCustomBuffer(context);
          gain.gain.value = this.config.volume;
          source.connect(gain);
          gain.connect(context.destination);
          source.start();
        } catch (error) {
          this.customBufferPromise = null;
          console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u043A\u043E\u0434\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0439 \u0437\u0432\u0443\u043A", error);
        }
        return;
      }
      try {
        const now = context.currentTime;
        const tones = {
          bell: [[740, 0, 0.24, "sine"], [988, 0.08, 0.3, "sine"]],
          chime: [[660, 0, 0.32, "sine"], [880, 0.12, 0.4, "sine"]],
          pop: [[360, 0, 0.12, "triangle"], [220, 0.04, 0.16, "sine"]]
        }[this.config.selectedPreset] || [];
        for (const [frequency, offset, duration, type] of tones) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const start = now + offset;
          oscillator.type = type;
          oscillator.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(1e-4, start);
          gain.gain.exponentialRampToValueAtTime(Math.max(1e-3, this.config.volume * 0.35), start + 0.015);
          gain.gain.exponentialRampToValueAtTime(1e-4, start + duration);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(start);
          oscillator.stop(start + duration);
        }
      } catch (error) {
        console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0437\u0432\u0443\u043A \u043F\u0438\u043D\u0433\u0430", error);
      }
    }
  };
  var pingSystem = new PingSystem();
  var RECENT_KEY = "t7recent";
  var LIMIT_KEY = "t7recentLimit";
  var DEFAULT_LIMIT = 20;
  var MAX_LIMIT = 100;
  function getRecentLimit() {
    const value = Number(store.get(LIMIT_KEY));
    return Number.isInteger(value) ? Math.max(1, Math.min(MAX_LIMIT, value)) : DEFAULT_LIMIT;
  }
  function setRecentLimit(value) {
    const parsed = Number(value);
    const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_LIMIT, Math.round(parsed))) : DEFAULT_LIMIT;
    store.set(LIMIT_KEY, limit);
    const recent = store.get(RECENT_KEY);
    if (Array.isArray(recent)) store.set(RECENT_KEY, recent.slice(-limit));
    document.dispatchEvent(new Event("t7-recent-limit-change"));
    return limit;
  }
  var SOFF = (() => {
    const p = store.get("t7spos");
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: 0, y: 0 };
  })();
  function setupDrag(el) {
    const win = el.querySelector(".t7-sw");
    const hd = el.querySelector(".t7-sth");
    const put = () => {
      win.style.transform = SOFF.x || SOFF.y ? `translate(${SOFF.x}px, ${SOFF.y}px)` : "";
    };
    put();
    const r0 = win.getBoundingClientRect();
    let fx = 0, fy = 0;
    if (r0.left < 8) fx = 8 - r0.left;
    else if (r0.right > innerWidth - 8) fx = innerWidth - 8 - r0.right;
    if (r0.top < 8) fy = 8 - r0.top;
    else if (r0.bottom > innerHeight - 8) fy = innerHeight - 8 - r0.bottom;
    if (fx || fy) {
      SOFF = { x: SOFF.x + fx, y: SOFF.y + fy };
      put();
    }
    hd.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.button > 0) return;
      const r = win.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, pid = e.pointerId, ox = SOFF.x, oy = SOFF.y;
      let started = false, nx = ox, ny = oy, raf = 0;
      const apply = () => {
        raf = 0;
        SOFF = { x: nx, y: ny };
        put();
      };
      const move = (ev) => {
        if (!started) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
          started = true;
          win.classList.add("t7-drag");
          try {
            hd.setPointerCapture(pid);
          } catch {
          }
        }
        nx = ox + clamp(ev.clientX - sx, 8 - r.left, innerWidth - r.width - 8 - r.left);
        ny = oy + clamp(ev.clientY - sy, 8 - r.top, innerHeight - r.height - 8 - r.top);
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const up = () => {
        hd.removeEventListener("pointermove", move);
        hd.removeEventListener("pointerup", up);
        hd.removeEventListener("pointercancel", up);
        if (raf) cancelAnimationFrame(raf);
        if (!started) return;
        win.classList.remove("t7-drag");
        SOFF = { x: nx, y: ny };
        put();
        store.set("t7spos", SOFF);
      };
      hd.addEventListener("pointermove", move);
      hd.addEventListener("pointerup", up);
      hd.addEventListener("pointercancel", up);
    });
    hd.addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      SOFF = { x: 0, y: 0 };
      store.set("t7spos", null);
      put();
    });
  }
  function updateSetStatus(t) {
    const e = st.set && st.set.querySelector(".t7-sst");
    if (e) e.textContent = t;
  }
  function onKey(e) {
    if (e.key === "Escape" && st.set) {
      e.stopPropagation();
      closeSettings();
    }
  }
  function closeSettings() {
    if (!st.set) return;
    st.set.remove();
    st.set = null;
    document.removeEventListener("keydown", onKey, true);
  }
  function openSettings() {
    if (st.set) return;
    const el = document.createElement("div");
    st.set = el;
    el.className = "t7-set";
    el.innerHTML = `
        <div class="t7-sw" role="dialog" aria-modal="true" aria-label="\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 7TV">
            <div class="t7-sth"><b>\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 7TV</b><button type="button" class="t7-x" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C">\xD7</button></div>
            <div class="t7-sec">
                <h4>\u042D\u043C\u043E\u0443\u0442\u044B</h4>
                <label class="t7-chk"><input type="checkbox" class="t7-on"> \u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u044D\u043C\u043E\u0443\u0442\u044B 7TV \u0432 \u0447\u0430\u0442\u0435</label>
            </div>
            <div class="t7-sec">
                <h4>\u041A\u0430\u043D\u0430\u043B</h4>
                <form class="t7-row">
                    <label class="t7-fl">\u041D\u0438\u043A \u0441\u0442\u0440\u0438\u043C\u0435\u0440\u0430 \u043D\u0430 Twitch<input type="text" class="t7-nick" maxlength="80" autocomplete="off" spellcheck="false"></label>
                    <button type="submit" class="t7-b p">\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C</button>
                </form>
                <div class="t7-sst" role="status"></div>
            </div>
            <div class="t7-sec">
                <h4>\u0420\u0430\u0437\u043C\u0435\u0440 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u0432 \u0447\u0430\u0442\u0435</h4>
                <div class="t7-szb">${Object.keys(SIZES).map((k) => `<button type="button" data-sz="${k}" aria-pressed="false">${SIZES[k].label}</button>`).join("")}</div>
            </div>
            <div class="t7-sec">
                <h4>\u041D\u0435\u0434\u0430\u0432\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0435</h4>
                <label class="t7-fl">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 "\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435"<input class="t7-recent-limit" type="number" min="1" max="100" step="1" inputmode="numeric"></label>
            </div>
            <div class="t7-sec">
                <h4>\u041F\u0438\u043D\u0433\u0438 \u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u044B</h4>
                <label class="t7-fl">\u041D\u0438\u043A\u0438 \u0438 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0434\u043B\u044F \u043F\u0438\u043D\u0433\u0430<textarea class="t7-ping-aliases" rows="2" placeholder="\u043D\u0438\u043A, nick, @\u043D\u0438\u043A"></textarea></label>
                <label class="t7-fl">\u0427\u0435\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u043D\u0438\u043A\u043E\u0432<textarea class="t7-ping-blacklist" rows="2" placeholder="\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u043D\u0438\u043A\u0443 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443"></textarea></label>
                <label class="t7-fl">\u0418\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441\u043E \u0441\u043B\u043E\u0432\u0430\u043C\u0438 \u0438\u043B\u0438 \u0444\u0440\u0430\u0437\u0430\u043C\u0438<textarea class="t7-ping-stopwords" rows="2" placeholder="\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0441\u043B\u043E\u0432\u0443 \u0438\u043B\u0438 \u0444\u0440\u0430\u0437\u0435 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443"></textarea></label>
                <label class="t7-fl">\u0417\u0432\u0443\u043A \u043F\u0438\u043D\u0433\u0430<select class="t7-ping-preset"><option value="bell">\u041A\u043E\u043B\u043E\u043A\u043E\u043B\u044C\u0447\u0438\u043A</option><option value="chime">\u0417\u0432\u043E\u043D</option><option value="pop">\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0441\u0438\u0433\u043D\u0430\u043B</option><option value="custom">\u0421\u0432\u043E\u0439 \u0437\u0432\u0443\u043A</option></select></label>
                <label class="t7-fl t7-volume">\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C<input class="t7-ping-volume" type="range" min="0" max="1" step="0.05"><output class="t7-volume-value"></output></label>
                <div class="t7-row t7-wrap">
                    <button type="button" class="t7-b" data-act="custom-sound">\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u0432\u043E\u0439 \u0437\u0432\u0443\u043A</button>
                    <button type="button" class="t7-b" data-act="test-ping">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0437\u0432\u0443\u043A</button>
                    <input type="file" class="t7-ping-file" accept="audio/*" hidden>
                </div>
                <div class="t7-ping-status" role="status"></div>
            </div>
            <div class="t7-sec">
                <h4>\u0414\u0430\u043D\u043D\u044B\u0435</h4>
                <div class="t7-row t7-wrap">
                    <button type="button" class="t7-b" data-act="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button>
                    <button type="button" class="t7-b" data-act="cache">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043A\u0435\u0448 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A</button>
                    <button type="button" class="t7-b" data-act="pos">\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E\u043A\u043E\u0448\u043A\u0430</button>
                </div>
            </div>
        </div>`;
    ["keydown", "keyup", "keypress"].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));
    el.addEventListener("pointerdown", (e) => {
      if (e.target === el) closeSettings();
    });
    el.querySelector(".t7-x").onclick = closeSettings;
    const on = el.querySelector(".t7-on");
    on.checked = S.on;
    on.addEventListener("change", () => {
      S.on = on.checked;
      store.set("t7on", S.on);
      rescanAll();
    });
    const nickInp = el.querySelector(".t7-nick");
    nickInp.value = S.nick;
    nickInp.placeholder = pageChan || "\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, zakvielchannel";
    el.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = nickInp.value.trim();
      const n = raw ? parseNick(raw) : pageChan;
      if (raw && !n) {
        setStatus("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043D\u0438\u043A: \u043D\u0443\u0436\u043D\u044B \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0435 \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B \u0438 _");
        return;
      }
      S.nick = n;
      nickInp.value = n;
      store.set("t7nick:" + pageChan, n);
      reload(true);
    });
    const pingFields = [
      [".t7-ping-aliases", "aliases"],
      [".t7-ping-blacklist", "blacklist"],
      [".t7-ping-stopwords", "stopWords"]
    ];
    for (const [selector, key] of pingFields) {
      const input = el.querySelector(selector);
      input.value = pingSystem.config[key].join("\n");
      input.addEventListener("change", () => pingSystem.setList(key, input.value));
    }
    const preset = el.querySelector(".t7-ping-preset");
    const customOption = preset.querySelector('option[value="custom"]');
    customOption.disabled = !pingSystem.config.customSound;
    preset.value = pingSystem.config.selectedPreset;
    preset.addEventListener("change", () => pingSystem.setPreset(preset.value));
    const volume = el.querySelector(".t7-ping-volume");
    const volumeValue = el.querySelector(".t7-volume-value");
    volume.value = String(pingSystem.config.volume);
    volumeValue.value = Math.round(pingSystem.config.volume * 100) + "%";
    volume.addEventListener("input", () => {
      pingSystem.setVolume(volume.value);
      volumeValue.value = Math.round(pingSystem.config.volume * 100) + "%";
    });
    const pingStatus = el.querySelector(".t7-ping-status");
    const pingFile = el.querySelector(".t7-ping-file");
    pingFile.addEventListener("change", async () => {
      try {
        await pingSystem.saveCustomSound(pingFile.files[0]);
        customOption.disabled = false;
        preset.value = pingSystem.config.selectedPreset;
        pingStatus.textContent = "\u0421\u0432\u043E\u0439 \u0437\u0432\u0443\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D";
      } catch (error) {
        pingStatus.textContent = error.message;
      }
      pingFile.value = "";
    });
    const mark = () => el.querySelectorAll("[data-sz]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sz === S.size)));
    mark();
    el.querySelector(".t7-szb").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sz]");
      if (!b || b.dataset.sz === S.size) return;
      S.size = b.dataset.sz;
      store.set("t7size", S.size);
      applySize();
      mark();
      rescanAll();
    });
    const recentLimit = el.querySelector(".t7-recent-limit");
    recentLimit.value = String(getRecentLimit());
    recentLimit.addEventListener("change", () => {
      recentLimit.value = String(setRecentLimit(recentLimit.value));
    });
    el.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "custom-sound") {
        pingSystem.unlockAudio();
        pingFile.click();
      } else if (b.dataset.act === "test-ping") pingSystem.play();
      else if (b.dataset.act === "refresh") reload(true);
      else if (b.dataset.act === "cache") {
        await clearImgs();
        setStatus("\u041A\u0435\u0448 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A \u043E\u0447\u0438\u0449\u0435\u043D");
        st.hooks.emotes();
      } else if (b.dataset.act === "pos") {
        st.pos = null;
        st.win = null;
        store.set("t7pos", null);
        store.set("t7win", null);
        st.hooks.place();
        SOFF = { x: 0, y: 0 };
        store.set("t7spos", null);
        el.querySelector(".t7-sw").style.transform = "";
        setStatus("\u041F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E\u043A\u043E\u0448\u043A\u0430 \u0441\u0431\u0440\u043E\u0448\u0435\u043D\u043E");
      }
    });
    document.body.appendChild(el);
    const px = el.querySelector(".t7-px"), pxs = el.querySelector(".t7-pxs");
    setupDrag(el);
    updateSetStatus(st.status);
    document.addEventListener("keydown", onKey, true);
  }
  var FAVORITES_KEY = "t7favorites";
  var RECENT_KEY2 = "t7recent";
  var gridMode = "all";
  var emoteData = /* @__PURE__ */ new Map();
  document.addEventListener("t7-recent-limit-change", () => {
    if (st.pop && gridMode === "recent") renderGrid();
  });
  function readEntries(key) {
    const value = store.get(key);
    if (!Array.isArray(value)) return [];
    const entries = value.map((item) => typeof item === "string" ? { name: item, emote: null } : item).filter((item) => item && typeof item.name === "string" && item.name);
    return [...new Map(entries.map((item) => [item.name, item])).values()];
  }
  function saveRecent(name) {
    const recent = readEntries(RECENT_KEY2).filter((item) => item.name !== name);
    recent.push({ name, emote: EM[name] || emoteData.get(name) || null });
    store.set(RECENT_KEY2, recent.slice(-getRecentLimit()));
  }
  function recordRecentFromMessage(message) {
    const names = String(message || "").split(/\s+/).filter((name) => Object.prototype.hasOwnProperty.call(EM, name));
    for (const name of names) saveRecent(name);
    if (names.length && gridMode === "recent") renderGrid();
  }
  function emoteFor(name) {
    return EM[name] || emoteData.get(name) || null;
  }
  function updateViewButtons() {
    if (!st.pop) return;
    st.pop.querySelectorAll("[data-view]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.view === gridMode));
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
  function chatInput() {
    const f = st.anchor && st.anchor.closest("form");
    return f && f.querySelector("input[type=text]");
  }
  function insertEmote(name) {
    const inp = chatInput();
    if (!inp || inp.disabled) return;
    const v = inp.value;
    const a = inp.selectionStart != null ? inp.selectionStart : v.length;
    const b = inp.selectionEnd != null ? inp.selectionEnd : a;
    const pre = v.slice(0, a), post = v.slice(b);
    const add = (pre && !/\s$/.test(pre) ? " " : "") + name + (/^\s/.test(post) ? "" : " ");
    const nv = pre + add + post;
    if (inp.maxLength > 0 && nv.length > inp.maxLength) return false;
    inp.value = nv;
    const pos = (pre + add).length;
    try {
      inp.setSelectionRange(pos, pos);
    } catch {
    }
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    if (!matchMedia("(pointer: coarse)").matches) inp.focus({ preventScroll: true });
    return true;
  }
  function requestGridImage(el, priority) {
    const em = emoteFor(el.dataset.name);
    if (!em) return;
    const request = fetchImg(urlFor(em, SIZES[S.size].n), priority);
    if (el.dataset.l) return;
    el.dataset.l = "1";
    request.then((src) => {
      if (el.isConnected) el.firstChild.src = src;
    }, () => {
    });
  }
  function onNear(entries) {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      if (st.io) st.io.unobserve(el);
      requestGridImage(el, 0);
    }
  }
  function onVisible(entries) {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      if (st.visibleIo) st.visibleIo.unobserve(el);
      requestGridImage(el, 1);
    }
  }
  function filterGrid() {
    if (!st.pop) return;
    const q = st.pop.querySelector(".t7-q").value.trim().toLowerCase();
    st.pop.querySelectorAll(".t7-gw").forEach((w) => {
      let vis = 0;
      w.querySelectorAll(".t7-item").forEach((item) => {
        const show2 = !q || item.dataset.name.toLowerCase().includes(q);
        item.hidden = !show2;
        if (show2) vis++;
      });
      w.hidden = !vis;
      w.previousElementSibling.hidden = !vis;
    });
  }
  function renderGrid() {
    if (!st.pop) return;
    const gr = st.pop.querySelector(".t7-gr");
    st.io.disconnect();
    st.visibleIo.disconnect();
    gr.textContent = "";
    const allNames = Object.keys(EM).sort((a, b) => a.localeCompare(b, void 0, { sensitivity: "base" }));
    const favoriteEntries = readEntries(FAVORITES_KEY);
    const recentEntries = readEntries(RECENT_KEY2).reverse();
    emoteData = new Map(Object.entries(EM));
    for (const item of [...favoriteEntries, ...recentEntries]) {
      if (!emoteData.has(item.name) && item.emote) emoteData.set(item.name, item.emote);
    }
    const favorites = favoriteEntries.map((item) => item.name);
    const names = gridMode === "favorites" ? favoriteEntries.filter((item) => emoteFor(item.name)).map((item) => item.name) : gridMode === "recent" ? recentEntries.filter((item) => emoteFor(item.name)).map((item) => item.name) : allNames;
    const sec = (title, list) => {
      if (!list.length) return;
      const h = document.createElement("div");
      h.className = "t7-sh";
      h.textContent = `${title} \xB7 ${list.length}`;
      const w = document.createElement("div");
      w.className = "t7-gw";
      for (const n of list) {
        const item = document.createElement("div");
        item.className = "t7-item";
        item.dataset.name = n;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "t7-it";
        b.dataset.name = n;
        b.setAttribute("aria-label", n);
        setEmoteTooltipData(b, n, emoteFor(n));
        const im = document.createElement("img");
        im.alt = "";
        im.decoding = "async";
        b.appendChild(im);
        const favorite = document.createElement("button");
        const isFavorite = favorites.includes(n);
        favorite.type = "button";
        favorite.className = "t7-fav";
        favorite.dataset.name = n;
        favorite.textContent = isFavorite ? "\u2605" : "\u2606";
        favorite.title = isFavorite ? "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435";
        favorite.setAttribute("aria-label", favorite.title + ": " + n);
        favorite.setAttribute("aria-pressed", String(isFavorite));
        item.append(b, favorite);
        w.appendChild(item);
        st.io.observe(b);
        st.visibleIo.observe(b);
      }
      gr.append(h, w);
    };
    if (gridMode === "all") {
      sec("\u041A\u0430\u043D\u0430\u043B", names.filter((n) => !EM[n].g));
      sec("\u0421\u0432\u043E\u0438", names.filter((n) => EM[n].x));
      sec("\u0413\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435", names.filter((n) => EM[n].g && !EM[n].x));
    } else {
      sec(gridMode === "favorites" ? "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435" : "\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435", names);
    }
    if (!names.length) {
      const d = document.createElement("div");
      d.className = "t7-emp";
      d.textContent = gridMode === "favorites" ? "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u044B\u0445 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0432 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u043D\u0430\u0431\u043E\u0440\u0430\u0445" : gridMode === "recent" ? "\u041D\u0435\u0434\u0430\u0432\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0432 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u043D\u0430\u0431\u043E\u0440\u0430\u0445" : "\u042D\u043C\u043E\u0443\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442";
      gr.appendChild(d);
    }
    filterGrid();
  }
  var GR_MIN = 156;
  function minH(pop) {
    const gr = pop.querySelector(".t7-gr");
    const kids = [...pop.children].filter((c) => !c.classList.contains("t7-rs") && !c.hidden);
    let h = 22;
    for (const c of kids) h += c === gr ? GR_MIN : c.offsetHeight;
    h += 8 * (kids.length - 1);
    return Math.ceil(h);
  }
  function place() {
    const pop = st.pop, anchor = st.anchor;
    if (!pop || !anchor || !anchor.isConnected) return;
    pop.style.transform = "";
    const w = clamp(st.win ? st.win.w : 340, 240, Math.max(240, innerWidth - 16));
    pop.style.width = w + "px";
    const mh = minH(pop);
    const size = (room) => {
      room = Math.max(room, mh);
      pop.style.maxHeight = (st.win ? room : Math.min(520, room)) + "px";
      pop.style.height = st.win ? clamp(st.win.h, mh, room) + "px" : "";
    };
    if (st.pos) {
      const x = clamp(st.pos.x, 8, Math.max(8, innerWidth - w - 8));
      const y = clamp(st.pos.y, 8, Math.max(8, innerHeight - 120));
      pop.style.left = x + "px";
      pop.style.top = y + "px";
      pop.style.bottom = "auto";
      size(Math.max(200, innerHeight - y - 8));
      return;
    }
    const r = anchor.getBoundingClientRect();
    pop.style.left = clamp(r.right - w, 8, Math.max(8, innerWidth - w - 8)) + "px";
    const above = r.top, below = innerHeight - r.bottom;
    if (above >= 300 || above > below) {
      pop.style.top = "auto";
      pop.style.bottom = innerHeight - r.top + 8 + "px";
      size(Math.max(200, above - 16));
    } else {
      pop.style.bottom = "auto";
      pop.style.top = r.bottom + 8 + "px";
      size(Math.max(200, below - 16));
    }
  }
  function onOutside(e) {
    if (e.target.closest && e.target.closest(".t7-set")) return;
    if (st.pop && !st.pop.contains(e.target) && !(st.anchor && st.anchor.contains(e.target))) closePop();
  }
  function onKey2(e) {
    if (st.set) return;
    if (e.key === "Escape" && st.pop) {
      e.stopPropagation();
      const a = st.anchor;
      closePop();
      if (a && a.isConnected) a.focus({ preventScroll: true });
    }
  }
  function closePop() {
    if (!st.pop) return;
    st.pop.remove();
    st.pop = null;
    if (st.io) st.io.disconnect();
    st.io = null;
    if (st.visibleIo) st.visibleIo.disconnect();
    st.visibleIo = null;
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey2, true);
    removeEventListener("resize", place);
  }
  function setupDrag2(pop) {
    const hd = pop.querySelector(".t7-h");
    hd.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.button > 0) return;
      const r = pop.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, pid = e.pointerId;
      let started = false, nx = r.left, ny = r.top, raf = 0;
      const apply = () => {
        raf = 0;
        pop.style.transform = `translate(${nx - r.left}px, ${ny - r.top}px)`;
      };
      const start = () => {
        started = true;
        pop.style.left = r.left + "px";
        pop.style.top = r.top + "px";
        pop.style.bottom = "auto";
        pop.style.maxHeight = r.height + "px";
        pop.classList.add("t7-drag");
        try {
          hd.setPointerCapture(pid);
        } catch {
        }
      };
      const move = (ev) => {
        if (!started) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
          start();
        }
        nx = clamp(r.left + ev.clientX - sx, 8, innerWidth - r.width - 8);
        ny = clamp(r.top + ev.clientY - sy, 8, innerHeight - 120);
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const up = () => {
        hd.removeEventListener("pointermove", move);
        hd.removeEventListener("pointerup", up);
        hd.removeEventListener("pointercancel", up);
        if (raf) cancelAnimationFrame(raf);
        if (!started || st.pop !== pop) return;
        pop.classList.remove("t7-drag");
        st.pos = { x: nx, y: ny };
        store.set("t7pos", st.pos);
        place();
      };
      hd.addEventListener("pointermove", move);
      hd.addEventListener("pointerup", up);
      hd.addEventListener("pointercancel", up);
    });
    hd.addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      st.pos = null;
      st.win = null;
      store.set("t7pos", null);
      store.set("t7win", null);
      place();
    });
  }
  function setupResize(pop) {
    const rs = pop.querySelector(".t7-rs");
    rs.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      e.stopPropagation();
      const r = pop.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      pop.style.transform = "";
      pop.style.left = r.left + "px";
      pop.style.top = r.top + "px";
      pop.style.bottom = "auto";
      pop.style.maxHeight = "none";
      pop.classList.add("t7-drag");
      let w = r.width, h = r.height, raf = 0;
      const mh = minH(pop);
      try {
        rs.setPointerCapture(e.pointerId);
      } catch {
      }
      const apply = () => {
        raf = 0;
        pop.style.width = w + "px";
        pop.style.height = h + "px";
      };
      const move = (ev) => {
        w = clamp(r.width + ev.clientX - sx, 240, Math.max(240, innerWidth - r.left - 8));
        h = clamp(r.height + ev.clientY - sy, mh, Math.max(mh, innerHeight - r.top - 8));
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const up = () => {
        rs.removeEventListener("pointermove", move);
        rs.removeEventListener("pointerup", up);
        rs.removeEventListener("pointercancel", up);
        if (raf) cancelAnimationFrame(raf);
        if (st.pop !== pop) return;
        pop.classList.remove("t7-drag");
        st.win = { w, h };
        st.pos = { x: r.left, y: r.top };
        store.set("t7win", st.win);
        store.set("t7pos", st.pos);
        place();
      };
      rs.addEventListener("pointermove", move);
      rs.addEventListener("pointerup", up);
      rs.addEventListener("pointercancel", up);
    });
  }
  function openPop(btn) {
    st.anchor = btn;
    const pop = document.createElement("div");
    st.pop = pop;
    pop.className = "t7-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "\u042D\u043C\u043E\u0443\u0442\u044B 7TV");
    pop.innerHTML = `
        <div class="t7-h"><b>7TV</b><span class="t7-hb"><button type="button" class="t7-g" aria-label="\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" title="\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438">\u2699</button><button type="button" class="t7-x" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C">\xD7</button></span></div>
        <input type="search" class="t7-q" placeholder="\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0443\u0442\u043E\u0432" autocomplete="off" aria-label="\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0443\u0442\u043E\u0432">
        <div class="t7-views" role="tablist" aria-label="\u0421\u043F\u0438\u0441\u043A\u0438 \u044D\u043C\u043E\u0443\u0442\u043E\u0432"><button type="button" role="tab" data-view="all" aria-selected="true">\u0412\u0441\u0435</button><button type="button" role="tab" data-view="favorites" aria-selected="false">\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435</button><button type="button" role="tab" data-view="recent" aria-selected="false">\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435</button></div>
        <div class="t7-gr"></div>
        <div class="t7-rs" title="\u041F\u043E\u0442\u044F\u043D\u0438, \u0447\u0442\u043E\u0431\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0440\u0430\u0437\u043C\u0435\u0440"></div>`;
    ["keydown", "keyup", "keypress"].forEach((t) => pop.addEventListener(t, (e) => e.stopPropagation()));
    setupDrag2(pop);
    setupResize(pop);
    pop.querySelector(".t7-x").onclick = () => {
      const a = st.anchor;
      closePop();
      if (a) a.focus({ preventScroll: true });
    };
    pop.querySelector(".t7-g").onclick = openSettings;
    pop.querySelector(".t7-q").addEventListener("input", filterGrid);
    gridMode = "all";
    pop.querySelector(".t7-views").addEventListener("click", (e) => {
      const button = e.target.closest("[data-view]");
      if (!button || button.dataset.view === gridMode) return;
      gridMode = button.dataset.view;
      updateViewButtons();
      renderGrid();
    });
    const gr = pop.querySelector(".t7-gr");
    gr.addEventListener("click", (e) => {
      const favorite = e.target.closest(".t7-fav");
      if (favorite) {
        toggleFavorite(favorite.dataset.name);
        return;
      }
      const b = e.target.closest(".t7-it");
      if (b) {
        saveRecent(b.dataset.name);
        insertEmote(b.dataset.name);
        if (gridMode === "recent") renderGrid();
      }
    });
    st.io = new IntersectionObserver(onNear, { root: gr, rootMargin: "240px" });
    st.visibleIo = new IntersectionObserver(onVisible, { root: gr });
    document.body.appendChild(pop);
    renderGrid();
    place();
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onKey2, true);
    addEventListener("resize", place);
  }
  function togglePop(btn) {
    if (st.pop && st.anchor === btn) closePop();
    else {
      closePop();
      openPop(btn);
    }
  }
  function ensureButtons() {
    document.querySelectorAll("form.cy-chat-f").forEach((f) => {
      const input = f.querySelector("input[type=text]");
      if (input && !f.dataset.t7RecentBound) {
        f.dataset.t7RecentBound = "1";
        const record = () => recordRecentFromMessage(input.value);
        f.addEventListener("submit", record, true);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && !e.isComposing && e.keyCode !== 229)
            record();
        }, true);
      }
      if (f.querySelector(".t7-btn")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "t7-btn";
      b.textContent = "7TV";
      b.title = "\u042D\u043C\u043E\u0443\u0442\u044B 7TV";
      b.setAttribute("aria-label", "\u042D\u043C\u043E\u0443\u0442\u044B 7TV");
      b.setAttribute("aria-haspopup", "dialog");
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePop(b);
      });
      const sub = f.querySelector("button[type=submit]");
      if (sub) sub.after(b);
      else f.appendChild(b);
    });
    if (st.pop && st.anchor && !st.anchor.isConnected) closePop();
  }
  var W = unsafeWindow;
  var CITY = "/api/city/chat";
  var MINE = "/api/mine/chat";
  var ORDER = ["g", "dm", "ev", "tr", "mn"];
  var MINE_ID = "home";
  var buf = { city: [], mine: [] };
  var inst = { city: null, mine: null };
  var filterObservers = { city: null, mine: null };
  var lastRoom = "";
  pingSystem.onChange = () => {
    for (const i of Object.values(inst)) if (i) i.raw.render();
  };
  var tagMn = (m) => m && m.tb !== "mn" ? { ...m, tb: "mn" } : m;
  var tagMsg = (r) => r && r.msg ? { ...r, msg: tagMn(r.msg) } : r;
  var byTime = (a, b) => (a.at || 0) - (b.at || 0);
  function push(room, msgs) {
    const a = buf[room];
    for (const m of msgs || []) if (m && m.id && !a.some((x) => x.id === m.id)) a.push(m);
    a.sort(byTime);
    if (a.length > 300) a.splice(0, a.length - 300);
  }
  function drop(ids) {
    for (const k of Object.keys(buf)) buf[k] = buf[k].filter((m) => !ids.includes(m.id));
  }
  function active(room) {
    const i = inst[room];
    const S2 = i && i.K.state();
    return !!(S2 && S2.chat && S2.chat.on);
  }
  function forward(room, d, sourceRoom) {
    if (!active(room)) return;
    const chat = chatOf(room);
    const forceUnread = !!(chat && sourceRoom && sourceRoom !== lastRoom);
    const wasOpen = forceUnread && chat.C.open;
    if (forceUnread) chat.C.open = false;
    let applied = false;
    try {
      inst[room].raw.apply(d);
      applied = true;
    } catch (e) {
      console.warn("[mine-tabs] forward", e);
    } finally {
      if (forceUnread) chat.C.open = wasOpen;
    }
    if (applied) countPings(room, d && d.chat);
  }
  var mineHist = 0;
  async function loadMineHistory(K) {
    if (mineHist) return;
    mineHist = 1;
    try {
      const x = K.X();
      if (!x) {
        mineHist = 0;
        return;
      }
      const r = await x.api("/api/mine/state?c=" + MINE_ID + "&mc=0");
      const src = r && r.mchat && Array.isArray(r.mchat.chat) ? r.mchat.chat : null;
      if (!src) {
        console.log("[mine-tabs] \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u0448\u0430\u0445\u0442\u044B: \u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043D\u0435\u0442 mchat", r);
        return;
      }
      const msgs = src.map(tagMn).filter((m) => m && m.id);
      push("mine", msgs);
      const i = inst.city;
      const c = i && i.K.state() && i.K.state().chat;
      if (!c || !c.on) return;
      const have = new Set(c.list.map((m) => m.id));
      for (const m of msgs.slice(-80)) if (!have.has(m.id)) c.list.push(m);
      c.list.sort((a, b) => (a.at || 0) - (b.at || 0));
      i.raw.render();
    } catch (e) {
      mineHist = 0;
      console.warn("[mine-tabs] \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u0448\u0430\u0445\u0442\u044B", e);
    }
  }
  function setupTabs(K) {
    const S2 = K.state();
    if (!S2 || !S2.chat || !S2.el) return;
    const C = S2.chat;
    C.mn = true;
    C.un = C.un || {};
    if (C.un.mn == null) C.un.mn = 0;
    const tabs = S2.el.querySelector(".cy-chat-tabs");
    if (!tabs) return;
    if (!tabs.querySelector('[data-tab="mn"]')) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", "false");
      b.dataset.tab = "mn";
      b.title = "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0438\u0437 \u0448\u0430\u0445\u0442\u044B";
      b.innerHTML = '\u0428\u0430\u0445\u0442\u0430<b class="cy-chat-tn" hidden></b>';
      tabs.appendChild(b);
    }
    const g = tabs.querySelector('[data-tab="g"]');
    if (g && g.firstChild && g.firstChild.nodeType === 3) g.firstChild.nodeValue = "\u0413\u043E\u0440\u043E\u0434";
    for (const k of ORDER) {
      const e = tabs.querySelector(`[data-tab="${k}"]`);
      if (e) tabs.appendChild(e);
    }
    if (!tabs._t7) {
      tabs._t7 = 1;
      new MutationObserver(() => {
        const c = K.state() && K.state().chat;
        if (tabs.hidden && c && !c.panel) tabs.hidden = false;
      }).observe(tabs, { attributes: true, attributeFilter: ["hidden"] });
    }
    if (!C.panel) tabs.hidden = false;
  }
  function selectTab(K, t) {
    const S2 = K.state();
    const b = S2 && S2.el && S2.el.querySelector(`.cy-chat-tabs [data-tab="${t}"]`);
    if (b) b.click();
  }
  var cityIn = false;
  var cityOutT = 0;
  async function cityPost(api, b) {
    let r = await api("/api/city/say", b);
    if (r && r.ok === false && /не в городе/.test(r.error || "")) {
      const e = await api("/api/city/enter", { x: 1e3, y: 1010, town: "fair" });
      if (e && e.ok) {
        cityIn = true;
        r = await api("/api/city/say", b);
      }
    }
    if (cityIn) {
      clearTimeout(cityOutT);
      cityOutT = setTimeout(() => {
        cityIn = false;
        try {
          api("/api/city/leave", {});
        } catch (e) {
        }
      }, 2e4);
    }
    return r;
  }
  var CHAT_JS = "/lib/site-chat.js";
  var chatLoad = null;
  function loadChatLib() {
    if (W.LGChat) return Promise.resolve();
    if (!chatLoad) chatLoad = new Promise((ok) => {
      const sc = document.createElement("script");
      sc.src = CHAT_JS;
      sc.onload = sc.onerror = () => ok();
      document.head.appendChild(sc);
    });
    return chatLoad;
  }
  function patchK(K, room) {
    const cache = /* @__PURE__ */ new WeakMap();
    const route = (api, p, b) => {
      const C = (K.state() || {}).chat;
      const tab = C && C.tab;
      if (p === K.say) {
        if (room === "mine") {
          if (tab === "mn") return Promise.resolve(api(p, b)).then(tagMsg);
          return cityPost(api, b);
        }
        if (tab === "mn") {
          return Promise.resolve(api("/api/mine/chat/say?c=" + MINE_ID, { text: b.text })).then((r) => {
            if (r && r.msg) push("mine", [tagMn(r.msg)]);
            return tagMsg(r);
          });
        }
      }
      return api(p, b);
    };
    return {
      ...K,
      flags: room === "mine" ? () => {
        const x = K.X();
        const h = x && x.hero && x.hero() || {};
        return { on: K.flags(h).on, tr: !!h.ct, dm: !!h.cd };
      } : K.flags,
      X: () => {
        const x = K.X();
        if (!x) return x;
        let m = cache.get(x);
        if (!m) {
          const api = (...a) => x.api(...a);
          m = new Proxy(x, {
            get(t, k) {
              if (k === "api") return (p, b) => route(api, p, b);
              const v = t[k];
              return typeof v === "function" ? v.bind(t) : v;
            }
          });
          cache.set(x, m);
        }
        return m;
      }
    };
  }
  var pings = { city: {}, mine: {} };
  function chatOf(room) {
    const i = inst[room];
    const S2 = i && i.K.state();
    return S2 && S2.chat ? { S: S2, C: S2.chat } : null;
  }
  function tabOfMsg(C, m) {
    return m.tb || (m.ev ? C.tr ? "ev" : "g" : m.k === "tr" ? "tr" : m.k === "dm" ? "dm" : "g");
  }
  function countPings(room, msgs) {
    const o = chatOf(room);
    if (!o) return;
    const x = inst[room].K.X();
    const me = String(x && x.login && x.login() || "").toLowerCase();
    const pg = pings[room];
    let hit = false;
    for (const m of msgs || []) {
      if (!m || String(m.l || "").toLowerCase() === me || m.ev || m.sys) continue;
      if (o.C.ign && o.C.ign.has(m.l)) continue;
      if (pingSystem.shouldIgnore(m.l, m.t)) continue;
      if (!pingSystem.isPinged(m.t, me ? [me] : [])) continue;
      const id = m.id == null ? "" : room + ":" + String(m.id);
      if (!id || !seenPings.has(id)) {
        pingSystem.play();
        if (id) {
          seenPings.add(id);
          if (seenPings.size > 500) seenPings.delete(seenPings.values().next().value);
        }
      }
      const tb = tabOfMsg(o.C, m);
      if (!o.C.on || o.C.open && o.C.tab === tb) continue;
      pg[tb] = (pg[tb] || 0) + 1;
      hit = true;
    }
    if (hit && o.C.on) paint(room);
  }
  var seenPings = /* @__PURE__ */ new Set();
  function markFilteredMessages(room) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector(".cy-chat-l");
    if (!list || !o.C) return;
    const visible = o.C.list.filter((m) => tabOfMsg(o.C, m) === o.C.tab && !(o.C.ign && o.C.ign.has(m.l)) && (o.C.tab !== "dm" || !o.C.peer || m.sys || m.l === o.C.peer || m.to === o.C.peer));
    const rows = list.querySelectorAll(":scope > li:not(.cy-chat-0)");
    const x = inst[room].K.X();
    const me = String(x && x.login && x.login() || "").toLowerCase();
    visible.forEach((m, index) => {
      const row = rows[index];
      if (!row) return;
      const label = pingSystem.filterLabel(m.l, m.t);
      row.classList.toggle("t7-filtered", !!label);
      row.classList.toggle("t7-filtered-blacklist", label === "\u0412 \u0427\u0421");
      row.classList.toggle("ping", !label && pingSystem.isPinged(m.t, me ? [me] : []));
      let tag = row.querySelector(":scope > .t7-filter-label");
      if (!label) {
        if (tag) tag.remove();
        return;
      }
      if (!tag) {
        tag = document.createElement("i");
        tag.className = "t7-filter-label";
        row.prepend(tag);
      }
      tag.textContent = label === "\u0412 \u0427\u0421" ? `\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${m.n || m.l} \u0432 \u0447\u0451\u0440\u043D\u043E\u043C \u0441\u043F\u0438\u0441\u043A\u0435` : "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0441\u043A\u0440\u044B\u0442\u043E \u0444\u0438\u043B\u044C\u0442\u0440\u043E\u043C";
      tag.title = label === "\u0412 \u0427\u0421" ? "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u0435\u043B\u044C \u0432 \u0432\u0430\u0448\u0435\u043C \u0447\u0435\u0440\u043D\u043E\u043C \u0441\u043F\u0438\u0441\u043A\u0435" : "\u0412 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0438 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0441\u043B\u043E\u0432\u043E \u0438\u043B\u0438 \u0444\u0440\u0430\u0437\u0430 \u0438\u0437 \u0444\u0438\u043B\u044C\u0442\u0440\u0430";
    });
  }
  var num = (n) => n > 99 ? "99+" : String(n);
  function badge(parent, cls, n, title) {
    let b = parent.querySelector(":scope > ." + cls);
    if (!b) {
      b = document.createElement("b");
      b.className = cls;
      parent.appendChild(b);
    }
    b.hidden = !n;
    b.textContent = n ? num(n) : "";
    b.title = n ? title + ": " + n : "";
  }
  function paint(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector(".cy-chat");
    if (!box) return;
    const pg = pings[room];
    if (o.C.open) pg[o.C.tab] = 0;
    let total = 0;
    box.querySelectorAll(".cy-chat-tabs [data-tab]").forEach((b) => {
      const n = pg[b.dataset.tab] || 0;
      total += n;
      badge(b, "cy-chat-tp", n, "\u0423\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439");
    });
    const t = box.querySelector(".cy-chat-t");
    if (t) badge(t, "cy-chat-pn", o.C.open ? 0 : total, "\u0423\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439");
  }
  function pingBind(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector(".cy-chat");
    if (!box || box.dataset.t7pg) return;
    box.dataset.t7pg = "1";
    box.addEventListener("click", () => paint(room));
    const list = box.querySelector(".cy-chat-l");
    if (list && !filterObservers[room]) {
      filterObservers[room] = new MutationObserver(() => markFilteredMessages(room));
      filterObservers[room].observe(list, { childList: true });
    }
    markFilteredMessages(room);
  }
  function wrapInst(raw, K, room) {
    const other = room === "mine" ? "city" : "mine";
    const mine = room === "mine";
    const byTime2 = (a, b) => (a.at || 0) - (b.at || 0);
    return {
      ...raw,
      init() {
        raw.init();
        setupTabs(K);
        pingBind(room);
      },
      enter(r) {
        let rr = r;
        if (r && Array.isArray(r.chat)) {
          const own = mine ? r.chat.map(tagMn) : r.chat;
          push(room, own);
          const extra = buf[other].filter((m) => !own.some((x) => x.id === m.id));
          rr = { ...r, chat: own.concat(extra).sort(byTime2) };
        }
        raw.enter(rr);
        setupTabs(K);
        pings[room] = {};
        pingBind(room);
        paint(room);
        if (lastRoom !== room) {
          lastRoom = room;
          selectTab(K, mine ? "mn" : "g");
        }
        if (!mine && typeof loadMineHistory === "function") {
          try {
            loadMineHistory(K);
          } catch (e) {
            console.warn("[mine-tabs] \u0438\u0441\u0442\u043E\u0440\u0438\u044F", e);
          }
        }
      },
      apply(d) {
        let dd = d;
        if (d && Array.isArray(d.chat)) {
          const own = mine ? d.chat.map(tagMn) : d.chat;
          push(room, own);
          dd = { ...d, chat: own };
        }
        raw.apply(dd);
        if (dd && dd.chat) countPings(room, dd.chat);
      }
    };
  }
  function wrapChat(v) {
    if (!v || v.__t7 || typeof v.make !== "function") return v;
    const make = v.make;
    const w = {
      ...v,
      make(K) {
        const room = K && K.base === MINE ? "mine" : K && K.base === CITY ? "city" : null;
        if (!room) return make(K);
        const KK = patchK(K, room);
        const raw = make(KK);
        inst[room] = { raw, K: KK };
        return wrapInst(raw, KK, room);
      }
    };
    w.__t7 = 1;
    return w;
  }
  function wrapCity(v) {
    if (!v || v.__t7 || typeof v.onEvent !== "function") return v;
    const o = v.onEvent;
    v.onEvent = function(d) {
      try {
        if (d) {
          if (Array.isArray(d.chat) && d.chat.length) push("city", d.chat);
          if (Array.isArray(d.chatDel) && d.chatDel.length) drop(d.chatDel);
          if (d.chat || d.chatDel) forward("mine", { chat: d.chat, chatDel: d.chatDel }, "city");
        }
      } catch (e) {
        console.warn("[mine-tabs] city", e);
      }
      return o.apply(this, arguments);
    };
    v.__t7 = 1;
    return v;
  }
  function wrapMine(v) {
    if (!v || v.__t7 || typeof v.onEvent !== "function") return v;
    const o = v.onEvent;
    v.onEvent = function(d) {
      try {
        if (d && d.chatRoom === "mine" && Array.isArray(d.chat) && !v.on) {
          const t = d.chat.map(tagMn);
          push("mine", t);
          forward("city", { chat: t }, "mine");
        }
      } catch (e) {
        console.warn("[mine-tabs] mine", e);
      }
      return o.apply(this, arguments);
    };
    const op = v.open;
    if (typeof op === "function") {
      v.open = function() {
        if (W.LGChat) return op.apply(this, arguments);
        const args = arguments, self = this;
        loadChatLib().then(() => op.apply(self, args));
      };
    }
    v.__t7 = 1;
    return v;
  }
  function hook(name, fn) {
    let val = W[name];
    if (val) val = fn(val);
    try {
      Object.defineProperty(W, name, {
        configurable: true,
        enumerable: true,
        get: () => val,
        set: (v) => {
          val = fn(v);
        }
      });
    } catch (e) {
      console.warn("[mine-tabs] hook", name, e);
    }
  }
  hook("LGChat", wrapChat);
  hook("LGCity", wrapCity);
  hook("LGMine", wrapMine);
  function init() {
    const style = document.createElement("style");
    style.textContent = styles_default;
    document.head.appendChild(style);
    initEmoteTooltip();
    const sz = store.get("t7size");
    if (SIZES[sz]) S.size = sz;
    S.nick = store.get("t7nick:" + pageChan) || pageChan;
    const p = store.get("t7pos");
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) st.pos = p;
    const w = store.get("t7win");
    if (w && Number.isFinite(w.w) && Number.isFinite(w.h)) st.win = w;
    applySize();
    if (store.get("t7on") === false) S.on = false;
    st.hooks.status = updateSetStatus;
    st.hooks.place = place;
    st.hooks.emotes = () => {
      rescanAll();
      renderGrid();
    };
    st.hooks.emotes = () => {
      rescanAll();
      renderGrid();
    };
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        ensureButtons();
        scan();
      });
    };
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    ensureButtons();
    reload(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
