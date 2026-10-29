import css from './styles.css';
import { SIZES, pageChan } from './config.js';
import { S, st } from './state.js';
import { store } from './store.js';
import { reload } from './emotes.js';
import { scan, rescanAll, applySize } from './chat.js';
import { renderGrid, place } from './popup.js';
import { updateSetStatus } from './settings.js';
import { ensureButtons } from './buttons.js';
import { initEmoteTooltip } from './emoteTooltip.js';
import './minetabs.js';


function init() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    initEmoteTooltip();

    // сохранённые настройки
    const sz = store.get('t7size');
    if (SIZES[sz]) S.size = sz;
    S.nick = store.get('t7nick:' + pageChan) || pageChan;
    const p = store.get('t7pos');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) st.pos = p;
    const w = store.get('t7win');
    if (w && Number.isFinite(w.w) && Number.isFinite(w.h)) st.win = w;
    applySize();
    if (store.get('t7on') === false) S.on = false;
    st.hooks.status = updateSetStatus;
    st.hooks.place = place;
    st.hooks.emotes = () => { rescanAll(); renderGrid(); };

    // связи между модулями
    st.hooks.emotes = () => { rescanAll(); renderGrid(); };

    // чат дорисовывается через innerHTML / insertAdjacentHTML, поэтому следим за страницей
    let queued = false;
    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; ensureButtons(); scan(); });
    };
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    ensureButtons();

    reload(false);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
