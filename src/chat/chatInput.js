import { st } from '../core/state.js';
import { HARD_BANNED_WORDS } from '../core/config.js';
import { EV, SEL, on } from '../core/consts.js';
import { togglePop, closePop, recordRecentFromMessage } from '../emotes/popup.js';
import { pingSystem } from './pingSystem.js';
import { arePastesEnabled, openPastes } from './pastes.js';

const bindings = new WeakMap();
function normalizeBanword(value) {
    return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
}

function findTwitchBanword(message) {
    const text = normalizeBanword(message);
    for (const raw of HARD_BANNED_WORDS) {
        const word = normalizeBanword(raw);
        if (!word) continue;
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matcher = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'u');
        if (matcher.test(text)) return String(raw).trim();
    }
    return '';
}

function showTwitchBanwordWarning(form, word) {
    let warning = form.querySelector(':scope > .t7-banword-warning');
    if (!warning) {
        warning = document.createElement('div');
        warning.className = 't7-banword-warning';
        warning.setAttribute('role', 'alert');
        form.appendChild(warning);
    }
    warning.textContent = `Сообщение не отправлено: найдено запрещённое слово «${word}».`;
    warning.hidden = false;
    const menu = form.querySelector('.t7-ping-menu');
    if (menu) menu.hidden = true;
}

function bindMessageHistory(input) {
    const history = [];
    let index = 0;
    let draft = '';
    let changingHistory = false;

    const setValue = (value) => {
        changingHistory = true;
        input.value = value;
        input.setSelectionRange(value.length, value.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        changingHistory = false;
    };
    const remember = (value) => {
        const message = String(value || '').trim();
        if (!message) return;
        if (history[history.length - 1] !== message) {
            history.push(message);
            if (history.length > 50) history.shift();
        }
        index = history.length;
        draft = '';
    };
    const onInput = () => {
        if (changingHistory) return;
        index = history.length;
        draft = input.value;
    };
    const onKeyDown = (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || !history.length) return;
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            if (index === history.length) draft = input.value;
            index = Math.max(0, index - 1);
            setValue(history[index]);
        } else if (event.key === 'ArrowDown' && index < history.length) {
            event.preventDefault();
            event.stopPropagation();
            index++;
            setValue(index === history.length ? draft : history[index]);
        }
    };

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown, true);
    return {
        remember,
        dispose() {
            input.removeEventListener('input', onInput);
            input.removeEventListener('keydown', onKeyDown, true);
        }
    };
}

function bindPingAutocomplete(form, input) {
    const menu = document.createElement('div');
    menu.className = 't7-ping-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    form.appendChild(menu);

    const getToken = () => {
        const caret = input.selectionStart == null ? input.value.length : input.selectionStart;
        if (caret !== input.selectionEnd) return null;
        const before = input.value.slice(0, caret);
        const match = /(?:^|\s)@([a-z0-9_]*)$/i.exec(before);
        return match ? { query: match[1].toLowerCase(), start: caret - match[1].length - 1, end: caret } : null;
    };
    const candidates = (query) => {
        const names = new Map();
        document.querySelectorAll(SEL.nickButtons).forEach((element) => {
            const name = String(element.dataset.nick || '').trim();
            if (name) names.set(name.toLowerCase(), name);
        });
        for (const alias of pingSystem.config.aliases) {
            const name = String(alias).replace(/^@/, '').trim();
            if (name && !/\s/.test(name)) names.set(name.toLowerCase(), name);
        }
        return [...names.values()]
            .filter((name) => name.toLowerCase().startsWith(query))
            .sort((a, b) => a.localeCompare(b))
            .slice(0, 7);
    };
    const complete = (name) => {
        const token = getToken();
        if (!token) return;
        input.value = input.value.slice(0, token.start) + '@' + name + ' ' + input.value.slice(token.end);
        const caret = token.start + name.length + 2;
        input.setSelectionRange(caret, caret);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus({ preventScroll: true });
        menu.hidden = true;
    };
    const update = () => {
        if (!pingSystem.config.tabCompletion) {
            menu.replaceChildren();
            menu.hidden = true;
            return;
        }
        const token = getToken();
        const matches = token && candidates(token.query);
        menu.replaceChildren();
        if (!matches || !matches.length) {
            menu.hidden = true;
            return;
        }
        for (const name of matches) {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 't7-ping-option';
            option.setAttribute('role', 'option');
            option.textContent = '@' + name;
            option.addEventListener('pointerdown', (event) => event.preventDefault());
            option.addEventListener('click', () => complete(name));
            menu.appendChild(option);
        }
        menu.hidden = false;
    };
    const onKeyDown = (event) => {
        if (event.key === 'Escape' && !menu.hidden) {
            menu.hidden = true;
            return;
        }
        if (event.key !== 'Tab' || menu.hidden) return;
        const token = getToken();
        const name = token && candidates(token.query)[0];
        if (!name) return;
        event.preventDefault();
        event.stopPropagation();
        complete(name);
    };

    input.addEventListener('input', update);
    input.addEventListener('keydown', onKeyDown, true);
    const unsubscribe = on(EV.tabCompletionChange, update);
    return () => {
        input.removeEventListener('input', update);
        input.removeEventListener('keydown', onKeyDown, true);
        unsubscribe();
        menu.remove();
    };
}

function bindChatForm(form, input) {
    const history = bindMessageHistory(input);
    const disposeAutocomplete = bindPingAutocomplete(form, input);
    let lastRecentMessage = '';
    let recentRecorded = false;
    let warning = null;

    const blockBannedWord = (event) => {
        const word = findTwitchBanword(input.value);
        if (!word) return false;
        event.preventDefault();
        event.stopImmediatePropagation();
        showTwitchBanwordWarning(form, word);
        return true;
    };

    const record = () => {
        const text = input.value.trim();
        if (!text) return;
        history.remember(text);
        if (recentRecorded && text === lastRecentMessage) return;
        recordRecentFromMessage(text);
        lastRecentMessage = text;
        recentRecorded = true;
    };
    const onInput = () => {
        if (input.value.trim() !== lastRecentMessage) recentRecorded = false;
        warning = form.querySelector(':scope > .t7-banword-warning');
        if (warning) warning.hidden = true;
    };
    const onSubmit = (event) => {
        if (blockBannedWord(event)) return;
        record();
    };
    const onClick = (event) => {
        if (event.target.closest(SEL.submitButton)) blockBannedWord(event);
    };
    const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.isComposing && event.keyCode !== 229) {
            if (blockBannedWord(event)) return;
            record();
        }
    };

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown, true);
    form.addEventListener('submit', onSubmit, true);
    form.addEventListener('click', onClick, true);
    return () => {
        history.dispose();
        disposeAutocomplete();
        input.removeEventListener('input', onInput);
        input.removeEventListener('keydown', onKeyDown, true);
        form.removeEventListener('submit', onSubmit, true);
        form.removeEventListener('click', onClick, true);
    };
}

function disposeForm(form) {
    const dispose = bindings.get(form);
    if (!dispose) return;
    if (st.anchor && form.contains(st.anchor)) closePop();
    dispose();
    bindings.delete(form);
}

export function disposeInputBindings(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches(SEL.chatForms)) disposeForm(node);
    node.querySelectorAll(SEL.chatForms).forEach(disposeForm);
}

export function ensureButtons() {
    document.querySelectorAll(SEL.chatForms).forEach((form) => {
        const input = form.querySelector(SEL.textInput);
        if (input && !bindings.has(form)) {
            bindings.set(form, form.matches(SEL.chatForm) ? bindChatForm(form, input) : () => {});
        }

        const submit = form.querySelector(SEL.submitButton);
        let button = form.querySelector('.t7-btn');
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 't7-btn';
            button.textContent = '7TV';
            button.title = 'Эмоуты 7TV';
            button.setAttribute('aria-label', 'Эмоуты 7TV');
            button.setAttribute('aria-haspopup', 'dialog');
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                togglePop(button);
            });
            if (submit) submit.before(button);
            else form.appendChild(button);
        }

        let pastesButton = form.querySelector('.t7-pastes-btn');
        if (!pastesButton) {
            pastesButton = document.createElement('button');
            pastesButton.type = 'button';
            pastesButton.className = 't7-btn t7-pastes-btn';
            pastesButton.textContent = 'Пасты';
            pastesButton.title = 'Сохранённые пасты';
            pastesButton.setAttribute('aria-label', 'Сохранённые пасты');
            pastesButton.hidden = !arePastesEnabled();
            pastesButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                openPastes(input);
            });
            if (submit) submit.before(pastesButton);
            else form.appendChild(pastesButton);
        }
    });

    if (st.pop && st.anchor && !st.anchor.isConnected) closePop();
}