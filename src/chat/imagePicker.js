import { imagePrefs, imageId, imageCard, savedImages, imageToken } from './images.js';
import { closePop } from '../emotes/popup.js';
import { store } from '../core/store.js';

let closeActive = null;
let activeInput = null;
export function closeImagePicker() { if (closeActive) closeActive(); }
export function disposeImagePicker(form) {
    if (activeInput && form.contains(activeInput)) closeImagePicker();
}
document.addEventListener('t7-emote-picker-open', closeImagePicker);
export function openImagePicker(input, anchor = input?.closest('form')?.querySelector('.t7-images-btn')) {
    if (!input || imagePrefs().mode === 'off') return;
    if (closeActive && activeInput === input) { closeImagePicker(); return; }
    closeImagePicker();
    closePop();
    activeInput = input;
    const dialog = document.createElement('section');
    dialog.className = 't7-paste-dialog t7-image-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', 'Картинки imgBB');
    dialog.innerHTML = `<div class="t7-paste-header"><b>Картинки imgBB</b><button type="button" class="t7-paste-close" aria-label="Закрыть">×</button></div>
        <div class="t7-image-url-row"><a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" title="Загрузить на imgBB" aria-label="Загрузить на imgBB">↗</a><input type="text" class="t7-image-url" placeholder="https://ibb.co/код" aria-label="Ссылка imgBB"></div>
        <div class="t7-image-preview" aria-live="polite"></div>
        <div class="t7-image-actions"><button type="button" class="t7-b" data-action="insert" disabled>Вставить</button><button type="button" class="t7-b" data-action="send" disabled>Отправить</button></div>
        <div class="t7-views" role="tablist"><button type="button" role="tab" data-tab="recent" aria-selected="true">Последние 10</button><button type="button" role="tab" data-tab="favorites" aria-selected="false">Избранные</button></div>
        <div class="t7-image-library"></div>`;
    const clamp = (value, min, max) => Math.max(min, Math.min(Math.max(min, max), value));
    let position = store.get('t7ImagePickerPosition');
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) position = null;
    const place = () => {
        if (!input.isConnected) { close(); return; }
        const bounds = dialog.getBoundingClientRect();
        const rect = (anchor || input).getBoundingClientRect();
        const x = position ? position.x : rect.right - bounds.width;
        const y = position ? position.y : rect.top >= bounds.height + 16
            ? rect.top - bounds.height - 8 : rect.bottom + 8;
        dialog.style.left = clamp(x, 8, innerWidth - bounds.width - 8) + 'px';
        dialog.style.top = clamp(y, 8, innerHeight - bounds.height - 8) + 'px';
    };
    const header = dialog.querySelector('.t7-paste-header');
    let endDrag = () => {};
    header.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('button')) return;
        event.preventDefault();
        endDrag();
        const bounds = dialog.getBoundingClientRect();
        const startX = event.clientX, startY = event.clientY;
        const move = (next) => {
            position = {
                x: clamp(bounds.left + next.clientX - startX, 8, innerWidth - dialog.offsetWidth - 8),
                y: clamp(bounds.top + next.clientY - startY, 8, innerHeight - dialog.offsetHeight - 8)
            };
            place();
        };
        const up = () => {
            endDrag();
            if (position) store.set('t7ImagePickerPosition', position);
        };
        endDrag = () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
    });
    header.addEventListener('dblclick', (event) => {
        if (event.target.closest('button')) return;
        position = null; store.set('t7ImagePickerPosition', null); place();
    });
    const resizeObserver = new ResizeObserver(place);
    const url = dialog.querySelector('.t7-image-url');
    const preview = dialog.querySelector('.t7-image-preview');
    const library = dialog.querySelector('.t7-image-library');
    let tab = 'recent';
    let selected = null;
    const render = () => {
        library.replaceChildren();
        const ids = savedImages(tab);
        if (!ids.length) library.textContent = tab === 'recent' ? 'Пока нет отправленных изображений' : 'Избранных изображений пока нет';
        for (const id of ids) {
            const item = document.createElement('div');
            item.className = 't7-image-library-item';
            const card = imageCard(id);
            const choose = document.createElement('button');
            choose.type = 'button'; choose.className = 't7-b'; choose.textContent = 'Выбрать';
            choose.onclick = () => { url.value = 'https://ibb.co/' + id; updatePreview(); };
            item.append(card, choose); library.append(item);
        }
    };
    const updatePreview = () => {
        selected = imageId(url.value.trim());
        preview.replaceChildren();
        if (selected) preview.append(imageCard(selected));
        else if (url.value.trim()) { preview.textContent = 'Неверная ссылка'; preview.classList.add('t7-image-error'); }
        preview.classList.toggle('t7-image-error', !!url.value.trim() && !selected);
        dialog.querySelectorAll('[data-action]').forEach((button) => { button.disabled = !selected; });
    };
    function close() {
        endDrag();
        resizeObserver.disconnect();
        dialog.remove();
        removeEventListener('resize', place);
        document.removeEventListener('keydown', keydown, true);
        document.removeEventListener('t7-image-library-change', render);
        if (closeActive === close) { closeActive = null; activeInput = null; }
        anchor?.setAttribute('aria-expanded', 'false');
    }
    const keydown = (event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); (anchor || input).focus({ preventScroll: true }); } };
    closeActive = close;
    dialog.querySelector('.t7-paste-close').onclick = () => { close(); (anchor || input).focus({ preventScroll: true }); };
    ['keydown', 'keyup', 'keypress'].forEach((name) => dialog.addEventListener(name, (event) => event.stopPropagation()));
    url.addEventListener('input', updatePreview);
    dialog.querySelectorAll('[data-tab]').forEach((button) => { button.onclick = () => {
        tab = button.dataset.tab;
        dialog.querySelectorAll('[data-tab]').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
        render();
    }; });
    dialog.querySelectorAll('[data-action]').forEach((button) => { button.onclick = () => {
        if (!selected || input.disabled || !input.isConnected) return;
        const form = input.closest('form');
        const token = imageToken(selected);
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const before = input.value.slice(0, start), after = input.value.slice(end);
        const inserted = (before && !/\s$/.test(before) ? ' ' : '') + token + (after && !/^\s/.test(after) ? ' ' : '');
        const value = before + inserted + after;
        if (input.maxLength > 0 && value.length > input.maxLength) {
            preview.textContent = 'Сообщение длинное'; preview.classList.add('t7-image-error'); return;
        }
        input.value = value;
        input.setSelectionRange(start + inserted.length, start + inserted.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        close();
        input.focus({ preventScroll: true });
        if (button.dataset.action === 'send') form?.requestSubmit();
    }; });
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('t7-image-library-change', render);
    document.body.append(dialog);
    render(); place(); url.focus();
    anchor?.setAttribute('aria-expanded', 'true');
    resizeObserver.observe(dialog);
    addEventListener('resize', place);
}
