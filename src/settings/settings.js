import { SIZES, pageChan } from '../core/config.js';
import { S, st } from '../core/state.js';
import { store } from '../core/store.js';
import { parseNick, clamp } from '../core/util.js';
import { reload, setStatus } from '../emotes/emotes.js';
import { rescanAll, applySize } from '../chat/chat.js';
import { clearImgs } from '../emotes/imgcache.js';
import { pingSystem } from '../chat/pingSystem.js';
import { getChatFont, getChatFontSize, getCustomChatFont, setChatFont, setChatFontSize, uploadChatFont, removeCustomChatFont } from '../chat/chatFonts.js';
import { getRecentLimit, setRecentLimit } from '../chat/prefs.js';
import { isLinkEncodingEnabled, setLinkEncodingEnabled } from '../chat/links.js';
import { CHAT_TABS, getChatTabPrefs, setChatTabPrefs } from '../chat/prefs.js';
import { STORE } from '../core/consts.js';
import { arePastesEnabled, setPastesEnabled } from '../chat/pastes.js';

// смещение окна настроек от центра экрана
let SOFF = (() => {
    const p = store.get(STORE.settingsPosition);
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: 0, y: 0 };
})();

function setupDrag(el) {
    const win = el.querySelector('.t7-sw');
    const hd = el.querySelector('.t7-sth');
    const put = () => { win.style.transform = (SOFF.x || SOFF.y) ? `translate(${SOFF.x}px, ${SOFF.y}px)` : ''; };

    // если экран стал меньше, чем при прошлом открытии, возвращаем окно в видимую область
    put();
    const r0 = win.getBoundingClientRect();
    let fx = 0, fy = 0;
    if (r0.left < 8) fx = 8 - r0.left; else if (r0.right > innerWidth - 8) fx = innerWidth - 8 - r0.right;
    if (r0.top < 8) fy = 8 - r0.top; else if (r0.bottom > innerHeight - 8) fy = innerHeight - 8 - r0.bottom;
    if (fx || fy) { SOFF = { x: SOFF.x + fx, y: SOFF.y + fy }; put(); }

    hd.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || e.button > 0) return;   // кнопка × остаётся кнопкой
        const r = win.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, pid = e.pointerId, ox = SOFF.x, oy = SOFF.y;
        let started = false, nx = ox, ny = oy, raf = 0;
        const apply = () => { raf = 0; SOFF = { x: nx, y: ny }; put(); };
        const move = (ev) => {
            if (!started) {
                if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
                started = true;
                win.classList.add('t7-drag');
                try { hd.setPointerCapture(pid); } catch {}
            }
            nx = ox + clamp(ev.clientX - sx, 8 - r.left, innerWidth - r.width - 8 - r.left);
            ny = oy + clamp(ev.clientY - sy, 8 - r.top, innerHeight - r.height - 8 - r.top);
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const up = () => {
            hd.removeEventListener('pointermove', move);
            hd.removeEventListener('pointerup', up);
            hd.removeEventListener('pointercancel', up);
            if (raf) cancelAnimationFrame(raf);
            if (!started) return;
            win.classList.remove('t7-drag');
            SOFF = { x: nx, y: ny };
            put();
            store.set(STORE.settingsPosition, SOFF);
        };
        hd.addEventListener('pointermove', move);
        hd.addEventListener('pointerup', up);
        hd.addEventListener('pointercancel', up);
    });

    hd.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        SOFF = { x: 0, y: 0 };
        store.set(STORE.settingsPosition, null);
        put();
    });
}

export function updateSetStatus(t) {
    const e = st.set && st.set.querySelector('.t7-sst');
    if (e) e.textContent = t;
}

function onKey(e) {
    if (e.key === 'Escape' && st.set) {
        e.stopPropagation();
        closeSettings();
    }
}

export function closeSettings() {
    if (!st.set) return;
    st.set.remove();
    st.set = null;
    document.removeEventListener('keydown', onKey, true);
}

export function openSettings() {
    if (st.set) return;
    const el = document.createElement('div');
    st.set = el;
    el.className = 't7-set';
    el.innerHTML = `
        <div class="t7-sw" role="dialog" aria-modal="true" aria-label="Настройки 7TV">
            <div class="t7-sth"><b>Настройки 7TV</b><button type="button" class="t7-x" aria-label="Закрыть">×</button></div>

            <details class="t7-sec">
                <summary>Эмоуты</summary>
                <label class="t7-chk"><input type="checkbox" class="t7-on"> Показывать эмоуты 7TV в чате</label>
            </details>

            <details class="t7-sec">
                <summary>Канал</summary>
                <form class="t7-row">
                    <label class="t7-fl">Ник стримера на Twitch<input type="text" class="t7-nick" maxlength="80" autocomplete="off" spellcheck="false"></label>
                    <button type="submit" class="t7-b p">Загрузить</button>
                </form>
                <div class="t7-sst" role="status"></div>
            </details>

            <details class="t7-sec">
                <summary>Размер эмоутов в чате</summary>
                <div class="t7-szb">${Object.keys(SIZES).map((k) => `<button type="button" data-sz="${k}" aria-pressed="false">${SIZES[k].label}</button>`).join('')}</div>
            </details>

            <details class="t7-sec">
                <summary>Вкладки чата</summary>
                <div class="t7-chat-tab-list"></div>
            </details>

            <details class="t7-sec">
                <summary>Пасты</summary>
                <label class="t7-chk"><input type="checkbox" class="t7-pastes-enabled"> Показывать кнопку паст в чате</label>
            </details>

            <details class="t7-sec">
                <summary>Недавно использованные</summary>
                <label class="t7-fl">Количество эмоутов в списке "Недавние"<input class="t7-recent-limit" type="number" min="1" max="100" step="1" inputmode="numeric"></label>
            </details>

            <details class="t7-sec">
                <summary>Ссылки в чате</summary>
                <label class="t7-chk"><input type="checkbox" class="t7-link-encoding"> Обрабатывать ссылки при отправке и отображении</label>
                <div class="t7-note" role="note"><span class="t7-note-icon" aria-hidden="true">!</span><span>Используйте на свой страх и риск.</span></div>
            </details>

            <details class="t7-sec">
                <summary>Шрифт чата</summary>
                <label class="t7-fl t7-chat-font-control">Гарнитура<select class="t7-chat-font"><option value="site">Как на сайте</option><option value="nunito">Nunito</option><option value="comfortaa">Comfortaa</option><option value="custom">Свой шрифт…</option></select></label>
                <label class="t7-fl t7-chat-font-size-control">Размер текста<input type="range" class="t7-chat-font-size" min="11" max="22" step="1"><output class="t7-chat-font-size-value"></output></label>
                <div class="t7-row t7-wrap t7-chat-font-actions"><button type="button" class="t7-b" data-act="chat-font">Загрузить файл шрифта</button><button type="button" class="t7-b" data-act="chat-font-reset">Удалить свой шрифт</button><input type="file" class="t7-chat-font-file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" hidden></div>
                <div class="t7-ping-status t7-chat-font-status" role="status"></div>
            </details>

            <details class="t7-sec">
                <summary>Пинги и фильтры</summary>
                <label class="t7-chk"><input type="checkbox" class="t7-tab-completion"> Дополнять ник по Tab</label>
                <label class="t7-fl">Ники и варианты для пинга<textarea class="t7-ping-aliases" rows="2" placeholder="ник, nick, @ник"></textarea></label>
                <label class="t7-fl t7-ping-color-control">Цвет упоминаний (@ник)<input type="color" class="t7-ping-color"></label>
                <label class="t7-fl">Черный список ников<textarea class="t7-ping-blacklist" rows="2" placeholder="по одному нику на строку"></textarea></label>
                <label class="t7-fl">Игнорировать сообщения со словами или фразами<textarea class="t7-ping-stopwords" rows="2" placeholder="по одному слову или фразе на строку"></textarea></label>
                <label class="t7-fl">Звук пинга<select class="t7-ping-preset"><option value="bell">Колокольчик</option><option value="chime">Звон</option><option value="pop">Короткий сигнал</option><option value="custom">Свой звук</option></select></label>
                <label class="t7-fl t7-volume">Громкость<input class="t7-ping-volume" type="range" min="0" max="1" step="0.05"><output class="t7-volume-value"></output></label>
                <div class="t7-row t7-wrap">
                    <button type="button" class="t7-b" data-act="custom-sound">Загрузить свой звук</button>
                    <button type="button" class="t7-b" data-act="test-ping">Проверить звук</button>
                    <input type="file" class="t7-ping-file" accept="audio/*" hidden>
                </div>
                <div class="t7-ping-status" role="status"></div>
            </details>

            <details class="t7-sec">
                <summary>Данные</summary>
                <div class="t7-row t7-wrap">
                    <button type="button" class="t7-b" data-act="refresh">Обновить список</button>
                    <button type="button" class="t7-b" data-act="cache">Очистить кеш картинок</button>
                    <button type="button" class="t7-b" data-act="pos">Сбросить положение окошка</button>
                </div>
            </details>
        </div>`;
    // игра не должна ловить клавиши, пока печатаем в настройках
    ['keydown', 'keyup', 'keypress'].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));
    el.addEventListener('pointerdown', (e) => { if (e.target === el) closeSettings(); });

    el.querySelector('.t7-x').onclick = closeSettings;

    const on = el.querySelector('.t7-on');
    on.checked = S.on;
    on.addEventListener('change', () => {
        S.on = on.checked;
        store.set(STORE.emotesEnabled, S.on);
        rescanAll();
    });

    const pastesEnabled = el.querySelector('.t7-pastes-enabled');
    pastesEnabled.checked = arePastesEnabled();
    pastesEnabled.addEventListener('change', () => setPastesEnabled(pastesEnabled.checked));

    const nickInp = el.querySelector('.t7-nick');
    nickInp.value = S.nick;
    nickInp.placeholder = pageChan || 'например, zakvielchannel';
    el.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = nickInp.value.trim();
        const n = raw ? parseNick(raw) : pageChan;
        if (raw && !n) { setStatus('Неверный ник: нужны латинские буквы, цифры и _'); return; }
        S.nick = n;
        nickInp.value = n;
        store.set(STORE.channelNickPrefix + pageChan, n);
        reload(true);
    });

    const pingFields = [
        ['.t7-ping-aliases', 'aliases'],
        ['.t7-ping-blacklist', 'blacklist'],
        ['.t7-ping-stopwords', 'stopWords']
    ];
    for (const [selector, key] of pingFields) {
        const input = el.querySelector(selector);
        input.value = pingSystem.config[key].join('\n');
        input.addEventListener('change', () => pingSystem.setList(key, input.value));
    }
    const tabCompletion = el.querySelector('.t7-tab-completion');
    tabCompletion.checked = pingSystem.config.tabCompletion;
    tabCompletion.addEventListener('change', () => pingSystem.setTabCompletion(tabCompletion.checked));
    const pingColor = el.querySelector('.t7-ping-color');
    pingColor.value = pingSystem.config.pingColor;
    pingColor.addEventListener('input', () => pingSystem.setPingColor(pingColor.value));
    const preset = el.querySelector('.t7-ping-preset');
    const customOption = preset.querySelector('option[value="custom"]');
    customOption.disabled = !pingSystem.config.customSound;
    preset.value = pingSystem.config.selectedPreset;
    preset.addEventListener('change', () => pingSystem.setPreset(preset.value));
    const volume = el.querySelector('.t7-ping-volume');
    const volumeValue = el.querySelector('.t7-volume-value');
    volume.value = String(pingSystem.config.volume);
    volumeValue.value = Math.round(pingSystem.config.volume * 100) + '%';
    volume.addEventListener('input', () => {
        pingSystem.setVolume(volume.value);
        volumeValue.value = Math.round(pingSystem.config.volume * 100) + '%';
    });
    const pingStatus = el.querySelector('.t7-ping-status');
    const pingFile = el.querySelector('.t7-ping-file');
    pingFile.addEventListener('change', async () => {
        try {
            await pingSystem.saveCustomSound(pingFile.files[0]);
            customOption.disabled = false;
            preset.value = pingSystem.config.selectedPreset;
            pingStatus.textContent = 'Свой звук сохранен';
        } catch (error) {
            pingStatus.textContent = error.message;
        }
        pingFile.value = '';
    });

    const chatFont = el.querySelector('.t7-chat-font');
    const chatFontFile = el.querySelector('.t7-chat-font-file');
    const chatFontStatus = el.querySelector('.t7-chat-font-status');
    const chatFontSize = el.querySelector('.t7-chat-font-size');
    const chatFontSizeValue = el.querySelector('.t7-chat-font-size-value');
    const customChatFont = getCustomChatFont();
    chatFont.value = getChatFont();
    chatFontSize.value = String(getChatFontSize());
    chatFontSizeValue.value = chatFontSize.value + ' px';
    chatFontSize.addEventListener('input', () => {
        const size = setChatFontSize(chatFontSize.value);
        chatFontSize.value = String(size);
        chatFontSizeValue.value = size + ' px';
    });
    el.querySelector('[data-act="chat-font-reset"]').disabled = !customChatFont;
    chatFontStatus.textContent = customChatFont ? `Загружен: ${customChatFont.name}` : '';
    chatFont.addEventListener('change', async () => {
        if (chatFont.value === 'custom' && !getCustomChatFont()) {
            chatFontFile.click();
            return;
        }
        if (await setChatFont(chatFont.value)) {
            const font = getCustomChatFont();
            chatFontStatus.textContent = chatFont.value === 'custom' && font ? `Загружен: ${font.name}` : '';
        } else {
            chatFont.value = getChatFont();
            chatFontStatus.textContent = 'Сначала загрузите свой шрифт';
        }
    });
    chatFontFile.addEventListener('change', async () => {
        try {
            const name = await uploadChatFont(chatFontFile.files[0]);
            chatFont.value = 'custom';
            el.querySelector('[data-act="chat-font-reset"]').disabled = false;
            chatFontStatus.textContent = `Загружен: ${name}`;
        } catch (error) {
            chatFont.value = getChatFont();
            chatFontStatus.textContent = error.message;
        }
        chatFontFile.value = '';
    });
    chatFontFile.addEventListener('cancel', () => { chatFont.value = getChatFont(); });

    const mark = () => el.querySelectorAll('[data-sz]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sz === S.size)));
    mark();
    el.querySelector('.t7-szb').addEventListener('click', (e) => {
        const b = e.target.closest('[data-sz]');
        if (!b || b.dataset.sz === S.size) return;
        S.size = b.dataset.sz;
        store.set(STORE.emoteSize, S.size);
        applySize();
        mark();
        rescanAll();
    });

    const recentLimit = el.querySelector('.t7-recent-limit');
    recentLimit.value = String(getRecentLimit());
    recentLimit.addEventListener('change', () => {
        recentLimit.value = String(setRecentLimit(recentLimit.value));
    });

    const chatTabList = el.querySelector('.t7-chat-tab-list');
    const renderChatTabPrefs = () => {
        const prefs = getChatTabPrefs();
        const visibleCount = prefs.order.filter((id) => !prefs.hidden.has(id)).length;
        chatTabList.replaceChildren(...prefs.order.map((id, index) => {
            const tab = CHAT_TABS.find((item) => item.id === id);
            const row = document.createElement('div');
            row.className = 't7-chat-tab-row';
            row.innerHTML = `<span class="t7-chat-tab-name">${tab.label}</span><label class="t7-chat-tab-visible"><input type="checkbox" data-tab-visible="${id}" ${prefs.hidden.has(id) ? '' : 'checked'} ${!prefs.hidden.has(id) && visibleCount === 1 ? 'disabled' : ''}>Показать</label><span class="t7-chat-tab-move"><button type="button" data-tab-move="up" data-tab-id="${id}" aria-label="Переместить ${tab.label} выше" title="Переместить выше" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-tab-move="down" data-tab-id="${id}" aria-label="Переместить ${tab.label} ниже" title="Переместить ниже" ${index === prefs.order.length - 1 ? 'disabled' : ''}>↓</button></span>`;
            return row;
        }));
    };
    chatTabList.addEventListener('change', (e) => {
        const checkbox = e.target.closest('input[data-tab-visible]');
        if (!checkbox) return;
        const prefs = getChatTabPrefs();
        if (checkbox.checked) prefs.hidden.delete(checkbox.dataset.tabVisible);
        else prefs.hidden.add(checkbox.dataset.tabVisible);
        setChatTabPrefs(prefs);
        renderChatTabPrefs();
    });
    chatTabList.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-tab-move]');
        if (!button || button.disabled) return;
        const prefs = getChatTabPrefs();
        const index = prefs.order.indexOf(button.dataset.tabId);
        const nextIndex = index + (button.dataset.tabMove === 'up' ? -1 : 1);
        if (index < 0 || nextIndex < 0 || nextIndex >= prefs.order.length) return;
        [prefs.order[index], prefs.order[nextIndex]] = [prefs.order[nextIndex], prefs.order[index]];
        setChatTabPrefs(prefs);
        renderChatTabPrefs();
    });
    renderChatTabPrefs();

    const linkEncoding = el.querySelector('.t7-link-encoding');
    linkEncoding.checked = isLinkEncodingEnabled();
    linkEncoding.addEventListener('change', () => {
        setLinkEncodingEnabled(linkEncoding.checked);
        rescanAll();
    });

    el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'custom-sound') {
            pingSystem.unlockAudio();
            pingFile.click();
        }
        else if (b.dataset.act === 'chat-font') chatFontFile.click();
        else if (b.dataset.act === 'chat-font-reset') {
            await removeCustomChatFont();
            chatFont.value = getChatFont();
            b.disabled = true;
            chatFontStatus.textContent = 'Свой шрифт удалён';
        }
        else if (b.dataset.act === 'test-ping') pingSystem.play();
        else if (b.dataset.act === 'refresh') reload(true);
        else if (b.dataset.act === 'cache') {
            await clearImgs();
            setStatus('Кеш картинок очищен');
            st.hooks.emotes();   // перерисовать чат и список (картинки скачаются заново)
        } else if (b.dataset.act === 'pos') {
            st.pos = null;
            st.win = null;
            store.set(STORE.popupPosition, null);
            store.set(STORE.popupSize, null);
            st.hooks.place();
            SOFF = { x: 0, y: 0 };
            store.set(STORE.settingsPosition, null);
            el.querySelector('.t7-sw').style.transform = '';
            setStatus('Положение окошка сброшено');
        }
    });

    document.body.appendChild(el);
    const px = el.querySelector('.t7-px'), pxs = el.querySelector('.t7-pxs');
    setupDrag(el);
    updateSetStatus(st.status);
    document.addEventListener('keydown', onKey, true);
}