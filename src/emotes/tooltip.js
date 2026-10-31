import { fetchImg } from './imgcache.js';
import { reusableUrlsFor, urlFor } from './emotes.js';

const tooltipData = new WeakMap();
let tooltip = null;
let current = null;
let imageToken = 0;
let initialized = false;

export function setEmoteTooltipData(element, name, emote) {
    if (element && emote) tooltipData.set(element, { name, emote });
}

function findTarget(node) {
    const element = node instanceof Element ? node.closest('.t7-e, .t7-it') : null;
    return element && tooltipData.has(element) ? element : null;
}

function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.className = 't7-tip';
    tooltip.id = 't7-emote-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    tooltip.innerHTML = '<div class="t7-tip-preview"><img alt=""></div><div class="t7-tip-info"><strong class="t7-tip-name"></strong><div class="t7-tip-author"></div><div class="t7-tip-type"></div></div>';
    document.body.appendChild(tooltip);
    return tooltip;
}

function position(target) {
    if (!tooltip || tooltip.hidden) return;
    const targetRect = target.getBoundingClientRect();
    const margin = 8;
    const rect = tooltip.getBoundingClientRect();
    const left = Math.max(margin, Math.min(innerWidth - rect.width - margin, targetRect.left + targetRect.width / 2 - rect.width / 2));
    const above = targetRect.top - rect.height - 10;
    const top = above >= margin ? above : Math.min(innerHeight - rect.height - margin, targetRect.bottom + 10);
    tooltip.style.left = left + 'px';
    tooltip.style.top = Math.max(margin, top) + 'px';
}

function show(target) {
    const data = tooltipData.get(target);
    if (!data) return;
    if (current && current !== target) current.removeAttribute('aria-describedby');
    current = target;
    const tip = ensureTooltip();
    const { name, emote } = data;
    const title = tip.querySelector('.t7-tip-name');
    title.replaceChildren(document.createTextNode(name));
    const logo = document.createElement('span');
    logo.className = 't7-tip-logo';
    logo.textContent = emote.tw ? 'T' : '7TV';
    logo.style.background = emote.tw ? '#9147ff' : '#111';
    logo.setAttribute('aria-label', emote.tw ? 'Twitch' : '7TV');
    title.appendChild(logo);

    const author = tip.querySelector('.t7-tip-author');
    author.replaceChildren();
    if (emote.owner) {
        author.append(document.createTextNode('by '));
        const owner = document.createElement('span');
        owner.textContent = emote.owner;
        author.appendChild(owner);
    }
    tip.querySelector('.t7-tip-type').textContent = emote.tw ? 'Twitch Global Emote'
        : emote.x ? 'Imported Emote' : emote.g ? 'Global Emote' : 'Channel Emote';

    const image = tip.querySelector('img');
    const token = ++imageToken;
    image.removeAttribute('src');
    image.classList.add('t7-tip-loading');
    tip.hidden = false;
    target.setAttribute('aria-describedby', tip.id);
    position(target);
    fetchImg(urlFor(emote, 4), true, reusableUrlsFor(emote, 4)).then((src) => {
        if (current !== target || token !== imageToken) return;
        image.src = src;
        image.classList.remove('t7-tip-loading');
    }, (error) => {
        if (current === target && token === imageToken) {
            image.classList.remove('t7-tip-loading');
            console.warn('[7TV] не удалось загрузить превью эмоута', name, error);
        }
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
        show(target);
    });
    document.addEventListener('mouseout', (event) => {
        if (!current) return;
        if (findTarget(event.relatedTarget) === current) return;
        hide();
    });
    document.addEventListener('focusin', (event) => {
        const target = findTarget(event.target);
        if (target) show(target);
    });
    document.addEventListener('focusout', (event) => {
        if (current === findTarget(event.target)) hide();
    });
    document.addEventListener('scroll', () => {
        if (current) hide();
    }, true);
}
