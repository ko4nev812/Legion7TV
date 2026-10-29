import { fetchImg } from './imgcache.js';
import { urlFor } from './emotes.js';

const tooltipData = new WeakMap();
let tooltip = null;
let current = null;
let initialized = false;
let imageToken = 0;

export function setEmoteTooltipData(element, name, emote) {
    if (element && emote) tooltipData.set(element, { name, emote });
}

function findTarget(node) {
    const element = node instanceof Element ? node.closest('.t7-e,.t7-it') : null;
    return element && tooltipData.has(element) ? element : null;
}

function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.className = 't7-tip';
    tooltip.id = 't7-emote-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    tooltip.innerHTML = '<div class="t7-tip-preview"><img alt=""></div><div class="t7-tip-info"><strong class="t7-tip-name"></strong><div class="t7-tip-rows"></div></div>';
    document.body.appendChild(tooltip);
    return tooltip;
}

function addRow(rows, label, value, className = '') {
    if (!value) return;
    const row = document.createElement('div');
    row.className = 't7-tip-row';
    const key = document.createElement('span');
    key.textContent = label;
    const content = document.createElement('span');
    content.textContent = value;
    if (className) content.className = className;
    row.append(key, content);
    rows.appendChild(row);
}

function sourceName(emote) {
    if (emote.x) return 'Пользовательский';
    return emote.g ? 'Глобальный 7TV' : 'Канал 7TV';
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
    tooltip.style.left = Math.max(margin, left) + 'px';
    tooltip.style.top = Math.max(margin, top) + 'px';
}

function show(target, clientX, clientY) {
    const data = tooltipData.get(target);
    if (!data) return;
    if (current && current !== target) current.removeAttribute('aria-describedby');
    current = target;
    const tip = ensureTooltip();
    const { name, emote } = data;
    tip.querySelector('.t7-tip-name').textContent = name;
    const rows = tip.querySelector('.t7-tip-rows');
    rows.textContent = '';
    addRow(rows, 'Источник', sourceName(emote));
    addRow(rows, 'Автор', emote.owner);
    if (emote.animated !== null && emote.animated !== undefined)
        addRow(rows, 'Тип', emote.animated ? 'Анимированный' : 'Статичный');
    if (emote.zw) addRow(rows, 'Наложение', 'Zero-width');
    addRow(rows, 'ID', emote.id, 't7-tip-id');

    const image = tip.querySelector('img');
    const token = ++imageToken;
    image.removeAttribute('src');
    image.classList.add('t7-tip-loading');
    tip.hidden = false;
    target.setAttribute('aria-describedby', tip.id);
    position(clientX, clientY);
    fetchImg(urlFor(emote, 4), true).then((src) => {
        if (current !== target || token !== imageToken) return;
        image.src = src;
        image.classList.remove('t7-tip-loading');
    }, () => {
        if (current === target && token === imageToken) image.classList.remove('t7-tip-loading');
    });
}

function hide() {
    if (current) current.removeAttribute('aria-describedby');
    current = null;
    imageToken++;
    if (tooltip) tooltip.hidden = true;
}

export function initEmoteTooltip() {
    if (initialized) return;
    initialized = true;
    document.addEventListener('mouseover', (event) => {
        const target = findTarget(event.target);
        if (!target || target === current) return;
        show(target, event.clientX, event.clientY);
    });
    document.addEventListener('mousemove', (event) => {
        if (current) position(event.clientX, event.clientY);
    });
    document.addEventListener('mouseout', (event) => {
        if (!current) return;
        const next = findTarget(event.relatedTarget);
        if (next === current) return;
        hide();
    });
    document.addEventListener('focusin', (event) => {
        const target = findTarget(event.target);
        if (!target) return;
        const rect = target.getBoundingClientRect();
        show(target, rect.right, rect.bottom);
    });
    document.addEventListener('focusout', (event) => {
        if (current === findTarget(event.target)) hide();
    });
}
