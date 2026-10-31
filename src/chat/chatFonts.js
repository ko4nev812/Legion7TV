import { store } from '../core/store.js';
import { STORE } from '../core/consts.js';

const GOOGLE_FONTS_ID = 't7-chat-google-fonts';
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Comfortaa:wght@700&display=swap';
const CUSTOM_FAMILY = 'T7UploadedChatFont';
const FONT_MIME = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };
const FONT_CHOICES = new Set(['site', 'nunito', 'comfortaa', 'custom']);
const MAX_FONT_SIZE = 2 * 1024 * 1024;
const DEFAULT_CHAT_FONT_SIZE = 14;
let customFace = null;

export function getChatFont() {
    const value = store.get(STORE.chatFont);
    return FONT_CHOICES.has(value) ? value : 'site';
}

export function getCustomChatFont() {
    const value = store.get(STORE.chatFontFile);
    return value && typeof value.name === 'string' && typeof value.source === 'string' ? value : null;
}

export function getChatFontSize() {
    const value = Number(store.get(STORE.chatFontSize));
    return Number.isFinite(value) ? Math.max(11, Math.min(22, Math.round(value))) : DEFAULT_CHAT_FONT_SIZE;
}

export function setChatFontSize(value) {
    const size = Number(value);
    if (!Number.isFinite(size)) return DEFAULT_CHAT_FONT_SIZE;
    const normalized = Math.max(11, Math.min(22, Math.round(size)));
    store.set(STORE.chatFontSize, normalized);
    document.documentElement.style.setProperty('--t7-chat-font-size', normalized + 'px');
    return normalized;
}

function setFamily(value) {
    if (value) document.documentElement.style.setProperty('--t7-chat-font', value);
    else document.documentElement.style.removeProperty('--t7-chat-font');
}

function ensureGoogleFonts() {
    if (document.getElementById(GOOGLE_FONTS_ID)) return;
    const link = document.createElement('link');
    link.id = GOOGLE_FONTS_ID;
    link.rel = 'stylesheet';
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
}

async function loadCustomFont(font) {
    if (!font || !font.source || typeof FontFace !== 'function') return false;
    const face = new FontFace(CUSTOM_FAMILY, `url("${font.source}")`);
    await face.load();
    if (customFace) document.fonts.delete(customFace);
    document.fonts.add(face);
    customFace = face;
    setFamily(`"${CUSTOM_FAMILY}", sans-serif`);
    return true;
}

export async function applyChatFont() {
    const choice = getChatFont();
    document.documentElement.style.setProperty('--t7-chat-font-size', getChatFontSize() + 'px');
    if (choice === 'nunito' || choice === 'comfortaa') ensureGoogleFonts();
    if (choice === 'custom') {
        try {
            if (await loadCustomFont(getCustomChatFont())) return true;
        } catch (error) {
            console.warn('[7TV] не удалось загрузить шрифт чата', error);
        }
        setFamily(null);
        return false;
    }
    setFamily(choice === 'nunito' ? 'Nunito, sans-serif'
        : choice === 'comfortaa' ? 'Comfortaa, sans-serif' : null);
    return true;
}

export async function setChatFont(choice) {
    if (!FONT_CHOICES.has(choice) || (choice === 'custom' && !getCustomChatFont())) return false;
    store.set(STORE.chatFont, choice);
    return applyChatFont();
}

function toBase64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return btoa(binary);
}

export async function uploadChatFont(file) {
    if (!file) throw new Error('Выберите файл шрифта');
    const extension = file.name.split('.').pop().toLowerCase();
    const mime = FONT_MIME[extension];
    if (!mime) throw new Error('Поддерживаются форматы WOFF2, WOFF, TTF и OTF');
    if (file.size > MAX_FONT_SIZE) throw new Error('Размер файла должен быть не больше 2 МБ');

    const bytes = new Uint8Array(await file.arrayBuffer());
    const source = `data:${mime};base64,${toBase64(bytes)}`;
    const font = { name: file.name, source };
    const face = new FontFace(CUSTOM_FAMILY, `url("${source}")`);
    try {
        await face.load();
    } catch {
        throw new Error('Не удалось загрузить этот файл шрифта');
    }

    if (customFace) document.fonts.delete(customFace);
    document.fonts.add(face);
    customFace = face;
    store.set(STORE.chatFontFile, font);
    store.set(STORE.chatFont, 'custom');
    setFamily(`"${CUSTOM_FAMILY}", sans-serif`);
    return font.name;
}

export async function removeCustomChatFont() {
    if (customFace) document.fonts.delete(customFace);
    customFace = null;
    store.set(STORE.chatFontFile, null);
    if (getChatFont() === 'custom') store.set(STORE.chatFont, 'site');
    await applyChatFont();
}