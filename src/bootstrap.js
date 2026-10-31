import css from './styles.css';
import { SIZES, pageChan } from './core/config.js';
import { STORE } from './core/consts.js';
import { S, st } from './core/state.js';
import { store } from './core/store.js';
import { reload } from './emotes/emotes.js';
import { scan, rescanAll, applySize } from './chat/chat.js';
import { renderGrid, place } from './emotes/popup.js';
import { updateSetStatus } from './settings/settings.js';
import { ensureButtons } from './chat/chatInput.js';
import { startChatObservers } from './chat/chatObservers.js';
import { applyChatFont } from './chat/chatFonts.js';
import { pingSystem } from './chat/pingSystem.js';
import { initEmoteTooltip } from './emotes/tooltip.js';
import './chat/minetabs.js';

let started = false;

function initialize() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const size = store.get(STORE.emoteSize);
    if (SIZES[size]) S.size = size;
    S.nick = store.get(STORE.channelNickPrefix + pageChan) || pageChan;
    const position = store.get(STORE.popupPosition);
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) st.pos = position;
    const windowSize = store.get(STORE.popupSize);
    if (windowSize && Number.isFinite(windowSize.w) && Number.isFinite(windowSize.h)) st.win = windowSize;
    if (store.get(STORE.emotesEnabled) === false) S.on = false;

    applySize();
    st.hooks.status = updateSetStatus;
    st.hooks.place = place;
    st.hooks.emotes = () => { rescanAll(); renderGrid(); };
    pingSystem.applyPingColor();
    applyChatFont();
    initEmoteTooltip();

    startChatObservers();
    ensureButtons();
    scan();
    reload(false);
}

export function startApp() {
    if (started) return;
    started = true;
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else
        initialize();
}
