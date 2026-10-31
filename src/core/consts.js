export const STORE = Object.freeze({
    emoteSize: 't7size',
    channelNickPrefix: 't7nick:',
    popupPosition: 't7pos',
    popupSize: 't7win',
    settingsPosition: 't7spos',
    emotesEnabled: 't7on',
    emoteCachePrefix: 't7c3:',
    favorites: 't7favorites',
    recentEmotes: 't7recent',
    recentEmoteLimit: 't7recentLimit',
    pingConfig: 't7ping',
    chatFont: 't7ChatFont',
    chatFontFile: 't7ChatFontFile',
    chatFontSize: 't7ChatFontSize',
    pingOnly: 't7PingOnly',
    pingArchive: 't7PingArchive',
    chatTabPrefs: 't7ChatTabPrefs',
    linkEncoding: 't7LinkEncoding',
    networkProxy: 't7proxy',
    pastes: 't7Pastes',
    pastesEnabled: 't7PastesEnabled'
});

export const EV = Object.freeze({
    tabCompletionChange: 't7-tab-completion-change',
    chatTabsChange: 't7-chat-tabs-change',
    recentLimitChange: 't7-recent-limit-change'
});

export const SEL = Object.freeze({
    chatRoot: '.cy-chat',
    chatList: '.cy-chat-l',
    chatRows: '.cy-chat-l li',
    freshChatRows: '.cy-chat-l li:not([data-l7tv-processed])',
    processedChatRows: '.cy-chat-l li[data-l7tv-processed]',
    dmRoot: '.cy-chat-dmx, .dm-l',
    dmRows: '.cy-chat-dmx li, .dm-l > li',
    freshDmRows: '.cy-chat-dmx li:not([data-l7tv-processed]), .dm-l > li:not([data-l7tv-processed])',
    processedDmRows: '.cy-chat-dmx li[data-l7tv-processed], .dm-l > li[data-l7tv-processed]',
    messageContent: ':scope > span:not([class])',
    nonEmptyChatRows: ':scope > li:not(.cy-chat-0)',
    chatForm: 'form.cy-chat-f',
    dmForm: 'form.dm-f',
    chatForms: 'form.cy-chat-f, form.dm-f',
    textInput: 'input[type=text]',
    submitButton: 'button[type=submit]',
    nickButtons: '.cy-chat-l b[data-nick]',
    nickButton: 'b[data-nick]',
    chatTabs: '.cy-chat-tabs',
    chatTabButtons: '.cy-chat-tabs [data-tab]',
    chatHeader: '.cy-chat-h',
    chatCloseButton: '.cy-chat-x',
    chatToggleButton: '.cy-chat-t',
    emptyMessage: '.cy-chat-0, .dm-0, .dm-old',
    systemMessage: '.cy-chat-sys',
    eventMessage: '.cy-chat-ev'
});

export const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export function emit(name, detail) {
    const event = detail === undefined ? new Event(name) : new CustomEvent(name, { detail });
    document.dispatchEvent(event);
    return event;
}

export function on(name, listener, options) {
    document.addEventListener(name, listener, options);
    return () => document.removeEventListener(name, listener, options);
}