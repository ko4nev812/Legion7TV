import { imagePrefs, imageId, imageCard, savedImages } from './images.js';

let closeActive = null;
export function closeImagePicker() { if (closeActive) closeActive(); }
export function openImagePicker(input) {
    if (!input || imagePrefs().mode === 'off') return;
    closeImagePicker();
    const overlay = document.createElement('div');
    overlay.className = 't7-paste-overlay';
    const dialog = document.createElement('section');
    dialog.className = 't7-paste-dialog t7-image-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Картинки imgBB');
    dialog.innerHTML = `<div class="t7-paste-header"><b>Картинки imgBB</b><button type="button" class="t7-paste-close" aria-label="Закрыть">×</button></div>
        <div class="t7-image-url-row"><a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" title="Загрузить на imgBB" aria-label="Загрузить на imgBB">↗</a><input type="text" class="t7-image-url" placeholder="https://ibb.co/код" aria-label="Ссылка imgBB"></div>
        <div class="t7-image-preview" aria-live="polite"></div>
        <div class="t7-image-actions"><button type="button" class="t7-b" data-action="insert" disabled>Вставить</button><button type="button" class="t7-b" data-action="send" disabled>Отправить</button></div>
        <div class="t7-views" role="tablist"><button type="button" role="tab" data-tab="recent" aria-selected="true">Последние 10</button><button type="button" role="tab" data-tab="favorites" aria-selected="false">Избранные</button></div>
        <div class="t7-image-library"></div>`;
    overlay.append(dialog);
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
        overlay.remove();
        document.removeEventListener('keydown', keydown, true);
        document.removeEventListener('t7-image-library-change', render);
        if (closeActive === close) closeActive = null;
        if (input.isConnected) input.focus({ preventScroll: true });
    }
    const keydown = (event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } };
    closeActive = close;
    dialog.querySelector('.t7-paste-close').onclick = close;
    overlay.addEventListener('pointerdown', (event) => { if (event.target === overlay) close(); });
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
        const token = `{img:${selected}}`;
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
        if (button.dataset.action === 'send') form?.requestSubmit();
    }; });
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('t7-image-library-change', render);
    document.body.append(overlay);
    render(); url.focus();
}
