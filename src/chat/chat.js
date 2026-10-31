import { SIZES } from '../core/config.js';
import { SEL } from '../core/consts.js';
import { S } from '../core/state.js';
import { processEmotes } from './chatEmotes.js';
import { processLinks } from './links.js';
import { processMentions } from './mentions.js';

const processors = [];
const SOURCE_KEY = 'l7tvEmoteSource';
export function registerChatProcessor(processor) {
    if (typeof processor === 'function' && !processors.includes(processor)) processors.push(processor);
}
registerChatProcessor(processEmotes);
registerChatProcessor(processLinks);
registerChatProcessor(processMentions);

/* ---------- сохраняем положение ленты при обновлении сообщений ---------- */
const scrollStates = new WeakMap();
const scrollListSelector = `${SEL.chatList}, .dm-l`;

function isAtEnd(list) {
    return list.scrollHeight - list.scrollTop - list.clientHeight < 40;
}

function getScrollState(list) {
    let state = scrollStates.get(list);
    if (!state) {
        state = { top: list.scrollTop, atEnd: isAtEnd(list), userInput: false, timer: 0 };
        scrollStates.set(list, state);
    }
    return state;
}

function markUserScroll(event) {
    const target = event.target && (event.target.nodeType === 1 ? event.target : event.target.parentElement);
    const list = target && target.closest(scrollListSelector);
    if (!list) return;
    const state = getScrollState(list);
    state.userInput = true;
    clearTimeout(state.timer);
    state.timer = setTimeout(() => { state.userInput = false; }, 250);
}

document.addEventListener('wheel', markUserScroll, true);
document.addEventListener('touchstart', markUserScroll, true);
document.addEventListener('touchmove', markUserScroll, true);
document.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
        markUserScroll(event);
}, true);
document.addEventListener('scroll', (event) => {
    const list = event.target;
    if (!list || !list.matches || !list.matches(scrollListSelector)) return;
    const state = getScrollState(list);
    if (!state.userInput) return;
    state.top = list.scrollTop;
    state.atEnd = isAtEnd(list);
    clearTimeout(state.timer);
    state.timer = setTimeout(() => { state.userInput = false; }, 250);
}, true);

function stickEnds(lists) {
    lists.forEach((list) => {
        const state = getScrollState(list);
        if (state.atEnd) list.scrollTop = list.scrollHeight;
        else list.scrollTop = state.top;
    });
}
function stickFrom(el) {
    const list = el.closest && el.closest(scrollListSelector);
    if (!list) return;
    const state = getScrollState(list);
    if (state.atEnd) list.scrollTop = list.scrollHeight;
    else list.scrollTop = state.top;
}

function processMessage(message, room) {
    if (message.dataset.l7tvProcessed || message.matches(SEL.emptyMessage)) return;

    const kind = message.matches(SEL.systemMessage) ? 'system'
        : message.matches(SEL.eventMessage) ? 'event' : 'message';
    let content = message;
    if (kind === 'message') {
        const spans = message.querySelectorAll(SEL.messageContent);
        content = spans[spans.length - 1];
        if (!content) return;
    }

    const source = kind === 'message'
        ? content.dataset[SOURCE_KEY] != null
            ? content.dataset[SOURCE_KEY]
            : content.dataset.t7o != null ? content.dataset.t7o : content.textContent
        : content.textContent;
    if (kind === 'message') {
        content.dataset[SOURCE_KEY] = source;
        content.replaceChildren(document.createTextNode(source));
    }

    message.dataset.l7tvProcessed = '1';
    const context = { message, content, room, kind, source, stickFrom };
    for (const processor of processors) processor(context);
}

export function scan() {
    const chatFresh = document.querySelectorAll(SEL.freshChatRows);
    const chatLists = new Set([...chatFresh].map((message) => message.closest(SEL.chatList)).filter(Boolean));
    chatLists.forEach(getScrollState);
    chatFresh.forEach((message) => processMessage(message, 'chat'));
    if (chatLists.size) stickEnds(chatLists);

    const dmFresh = document.querySelectorAll(SEL.freshDmRows);
    const dmLists = new Set([...dmFresh].map((message) => message.closest('.dm-l')).filter(Boolean));
    dmLists.forEach(getScrollState);
    dmFresh.forEach((message) => processMessage(message, 'dm'));
    if (dmLists.size) stickEnds(dmLists);
}

export function rescanAll() {
    document.querySelectorAll(`${SEL.processedChatRows}, ${SEL.processedDmRows}`)
        .forEach((message) => { delete message.dataset.l7tvProcessed; });
    scan();
}

export const applySize = () => {
    document.documentElement.style.setProperty('--t7-h', SIZES[S.size].h);
    document.documentElement.style.setProperty('--t7-tile', SIZES[S.size].p + 'px');
};