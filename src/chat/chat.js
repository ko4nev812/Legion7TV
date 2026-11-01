import { SIZES } from '../core/config.js';
import { SEL } from '../core/consts.js';
import { S } from '../core/state.js';
import { processEmotes } from './chatEmotes.js';
import { processLinks } from './links.js';
import { processImages } from './images.js';
import { processMentions } from './mentions.js';
import { getScrollContainer, getScrollState, isAtEnd, scrollToEnd } from './scrollState.js';

const processors = [];
const SOURCE_KEY = 'l7tvEmoteSource';
export function registerChatProcessor(processor) {
    if (typeof processor === 'function' && !processors.includes(processor)) processors.push(processor);
}
registerChatProcessor(processEmotes);
registerChatProcessor(processImages);
registerChatProcessor(processLinks);
registerChatProcessor(processMentions);

/* ---------- сохраняем положение ленты при обновлении сообщений ---------- */
const scrollListSelector = `${SEL.chatList}, .cy-chat-dmx, .dm-l`;

document.addEventListener('scroll', (event) => {
    const list = getScrollContainer(event.target);
    if (!list || !list.matches || !list.matches(scrollListSelector)) return;
    getScrollState(list).atEnd = isAtEnd(list);
}, true);

function stickEnds(lists) {
    lists.forEach((list) => {
        const state = getScrollState(list);
        if (state.atEnd) scrollToEnd(list);
    });
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
    const context = { message, content, room, kind, source };
    for (const processor of processors) processor(context);
}

export function scan() {
    const chatFresh = document.querySelectorAll(SEL.freshChatRows);
    const chatLists = new Set([...chatFresh].map((message) => message.closest(SEL.chatList)).filter(Boolean));
    chatLists.forEach(getScrollState);
    chatFresh.forEach((message) => processMessage(message, 'chat'));
    if (chatLists.size) stickEnds(chatLists);

    const dmFresh = document.querySelectorAll(SEL.freshDmRows);
    const dmLists = new Set([...dmFresh].map((message) => getScrollContainer(message)).filter(Boolean));
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
