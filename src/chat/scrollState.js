import { SEL } from '../core/consts.js';

const scrollStates = new WeakMap();
const scrollListSelector = `${SEL.chatList}, .cy-chat-dmx, .dm-l`;

// Stable across a site's full innerHTML rebuild, unlike the row node itself.
export function messageKey(row) {
    const content = row.querySelector?.(SEL.messageContent + '[data-l7tv-emote-source]')
        || [...(row.querySelectorAll?.(SEL.messageContent) || [])].at(-1);
    const source = content?.dataset?.l7tvEmoteSource ?? content?.textContent ?? row.textContent;
    const header = [...(row.children || [])].filter((child) => child !== content).map((child) => child.textContent);
    return JSON.stringify([row.dataset?.id || '', source, header]);
}

export function getScrollContainer(element) {
    let fallback = null;
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
        if (!node.matches(scrollListSelector)) continue;
        fallback ||= node;
        const overflowY = getComputedStyle(node).overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
            && node.clientHeight > 0 && node.scrollHeight > node.clientHeight + 1) return node;
    }
    return fallback;
}

export function isAtEnd(list) {
    const tolerance = list.matches('.dm-l, .cy-chat-dmx') ? 2 : 40;
    return list.scrollHeight - list.scrollTop - list.clientHeight < tolerance;
}

export function scrollToEnd(list) {
    list.scrollTo({ top: list.scrollHeight, behavior: 'instant' });
}

export function getScrollState(list) {
    let state = scrollStates.get(list);
    if (!state) {
        state = { atEnd: isAtEnd(list) };
        scrollStates.set(list, state);
    }
    return state;
}

export function mutatePreservingScroll(element, mutate) {
    const list = getScrollContainer(element);
    if (!list) {
        mutate();
        return;
    }

    const wasAtEnd = isAtEnd(list);
    const previousTop = list.scrollTop;
    const listRect = list.getBoundingClientRect();
    const rowList = element.matches && element.matches(scrollListSelector)
        ? element
        : element.closest && element.closest(scrollListSelector);
    const candidates = rowList && rowList.children.length ? rowList.children : list.children;
    const anchor = [...candidates].find((child) => {
        const rect = child.getBoundingClientRect();
        return rect.bottom > listRect.top && rect.top < listRect.bottom;
    });
    const anchorTop = anchor && anchor.getBoundingClientRect().top;
    const anchorKey = anchor && messageKey(anchor);
    const anchorIndex = anchor && [...candidates].slice(0, [...candidates].indexOf(anchor)).filter((row) => messageKey(row) === anchorKey).length;

    mutate();

    if (wasAtEnd) {
        scrollToEnd(list);
    } else if (anchor) {
        const nextRows = rowList?.isConnected ? rowList.children : list.children;
        const replacement = anchor.isConnected ? anchor : [...nextRows].filter((row) => messageKey(row) === anchorKey)[anchorIndex];
        const top = replacement ? list.scrollTop + replacement.getBoundingClientRect().top - anchorTop : previousTop;
        if (top !== list.scrollTop) list.scrollTo({ top, behavior: 'instant' });
    }
    getScrollState(list).atEnd = isAtEnd(list);
}
