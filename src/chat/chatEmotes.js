import { SIZES } from '../core/config.js';
import { S, EM } from '../core/state.js';
import { has } from '../core/util.js';
import { fetchImg } from '../emotes/imgcache.js';
import { reusableUrlsFor, urlFor } from '../emotes/emotes.js';
import { setEmoteTooltipData } from '../emotes/tooltip.js';

function makeImg(name, em, cls, stickFrom) {
    const img = document.createElement('img');
    img.className = cls;
    img.alt = name;
    if (cls === 't7-e') setEmoteTooltipData(img, name, em);
    img.addEventListener('load', () => stickFrom(img));
    const resolution = SIZES[S.size].n;
    fetchImg(urlFor(em, resolution), true, reusableUrlsFor(em, resolution)).then(
        (data) => { img.src = data; },
        (error) => {
            console.warn('[7TV] картинка не загрузилась', name, error);
            img.replaceWith(document.createTextNode(name));
        }
    );
    return img;
}

export function processEmotes({ content, kind, source, stickFrom }) {
    if (kind !== 'message') return;

    const parts = source.split(/(\s+)/);
    if (!S.on || !parts.some((part) => has(EM, part))) return;

    const fragment = document.createDocumentFragment();
    let lastWrap = null;
    for (const part of parts) {
        const emote = has(EM, part) ? EM[part] : null;
        if (emote && emote.zw && lastWrap) {
            lastWrap.appendChild(makeImg(part, emote, 't7-zw', stickFrom));
            continue;
        }
        if (emote) {
            const wrapper = document.createElement('span');
            wrapper.className = 't7-w';
            wrapper.appendChild(makeImg(part, emote, 't7-e', stickFrom));
            fragment.appendChild(wrapper);
            lastWrap = wrapper;
            continue;
        }
        if (/^\s+$/.test(part)) {
            if (lastWrap) {
                fragment.appendChild(document.createTextNode(part));
                continue;
            }
        } else if (part) {
            lastWrap = null;
        }
        if (part) fragment.appendChild(document.createTextNode(part));
    }
    content.replaceChildren(fragment);
}
