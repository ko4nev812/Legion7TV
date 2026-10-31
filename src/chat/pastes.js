import { store } from '../core/store.js';
import { STORE } from '../core/consts.js';

const PASTES_KEY = STORE.pastes;
const PASTES_ENABLED_KEY = STORE.pastesEnabled;
let closeActiveDialog = null;

export function arePastesEnabled() {
    return store.get(PASTES_ENABLED_KEY) === true;
}

export function setPastesEnabled(enabled) {
    const active = !!enabled;
    store.set(PASTES_ENABLED_KEY, active);
    document.querySelectorAll('.t7-pastes-btn').forEach((button) => { button.hidden = !active; });
    if (!active && closeActiveDialog) closeActiveDialog();
}

function readPastes() {
    const saved = store.get(PASTES_KEY);
    if (!Array.isArray(saved)) return [];
    return saved.filter((paste) => paste && typeof paste.name === 'string' && typeof paste.text === 'string');
}

function insertPaste(input, text) {
    if (!input || input.disabled || !input.isConnected) return;
    const start = input.selectionStart == null ? input.value.length : input.selectionStart;
    const end = input.selectionEnd == null ? start : input.selectionEnd;
    const value = input.value.slice(0, start) + text + input.value.slice(end);
    if (input.maxLength > 0 && value.length > input.maxLength) return;
    input.value = value;
    const caret = start + text.length;
    try { input.setSelectionRange(caret, caret); } catch {}
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus({ preventScroll: true });
}

export function openPastes(input) {
    if (!input || !arePastesEnabled()) return;
    if (closeActiveDialog) closeActiveDialog();

    const overlay = document.createElement('div');
    overlay.className = 't7-paste-overlay';
    const dialog = document.createElement('section');
    dialog.className = 't7-paste-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Сохранённые пасты');

    const header = document.createElement('div');
    header.className = 't7-paste-header';
    const title = document.createElement('strong');
    title.textContent = 'Сохранённые пасты';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 't7-paste-close';
    close.textContent = '×';
    close.title = 'Закрыть';
    close.setAttribute('aria-label', 'Закрыть');
    header.append(title, close);

    const list = document.createElement('div');
    list.className = 't7-paste-list';
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 't7-paste-add t7-paste-primary';
    addButton.textContent = 'Добавить пасту';

    const editor = document.createElement('form');
    editor.className = 't7-paste-editor';
    editor.hidden = true;
    const nameLabel = document.createElement('label');
    nameLabel.className = 't7-paste-field';
    nameLabel.textContent = 'Название';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 60;
    nameInput.required = true;
    nameInput.autocomplete = 'off';
    nameLabel.appendChild(nameInput);
    const textLabel = document.createElement('label');
    textLabel.className = 't7-paste-field';
    textLabel.textContent = 'Текст';
    const textInput = document.createElement('textarea');
    textInput.rows = 5;
    textInput.required = true;
    textLabel.appendChild(textInput);
    const editorActions = document.createElement('div');
    editorActions.className = 't7-paste-actions';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 't7-paste-secondary';
    cancelButton.textContent = 'Отмена';
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 't7-paste-primary';
    saveButton.textContent = 'Сохранить';
    editorActions.append(cancelButton, saveButton);
    editor.append(nameLabel, textLabel, editorActions);
    dialog.append(header, list, addButton, editor);
    overlay.appendChild(dialog);
    let editingIndex = null;

    const onKeyDown = (event) => {
        if (event.key === 'Escape') closeDialog();
    };
    const closeDialog = () => {
        overlay.remove();
        document.removeEventListener('keydown', onKeyDown, true);
        if (closeActiveDialog === closeDialog) closeActiveDialog = null;
    };
    closeActiveDialog = closeDialog;

    const renderList = () => {
        const pastes = readPastes();
        list.replaceChildren();
        list.hidden = !editor.hidden;
        if (!pastes.length) {
            const empty = document.createElement('div');
            empty.className = 't7-paste-empty';
            empty.textContent = 'Паст пока нет';
            list.appendChild(empty);
            return;
        }
        pastes.forEach((paste, index) => {
            const row = document.createElement('div');
            row.className = 't7-paste-row';
            const insertButton = document.createElement('button');
            insertButton.type = 'button';
            insertButton.className = 't7-paste-item';
            insertButton.textContent = paste.name;
            insertButton.title = paste.text;
            insertButton.addEventListener('click', () => {
                insertPaste(input, paste.text);
                closeDialog();
            });
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 't7-paste-edit';
            editButton.textContent = '✎';
            editButton.title = `Редактировать пасту «${paste.name}»`;
            editButton.setAttribute('aria-label', editButton.title);
            editButton.addEventListener('click', () => {
                editingIndex = index;
                nameInput.value = paste.name;
                textInput.value = paste.text;
                editor.hidden = false;
                addButton.hidden = true;
                renderList();
                nameInput.focus();
            });
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 't7-paste-delete';
            deleteButton.textContent = '×';
            deleteButton.title = `Удалить пасту «${paste.name}»`;
            deleteButton.setAttribute('aria-label', deleteButton.title);
            deleteButton.addEventListener('click', () => {
                const next = readPastes();
                next.splice(index, 1);
                store.set(PASTES_KEY, next);
                renderList();
            });
            row.append(insertButton, editButton, deleteButton);
            list.appendChild(row);
        });
    };

    close.addEventListener('click', closeDialog);
    overlay.addEventListener('pointerdown', (event) => {
        if (event.target === overlay) closeDialog();
    });
    addButton.addEventListener('click', () => {
        editingIndex = null;
        editor.reset();
        editor.hidden = false;
        addButton.hidden = true;
        renderList();
        nameInput.focus();
    });
    cancelButton.addEventListener('click', () => {
        editingIndex = null;
        editor.reset();
        editor.hidden = true;
        addButton.hidden = false;
        renderList();
    });
    editor.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();
        const text = textInput.value;
        if (!name || !text.trim()) return;
        const pastes = readPastes();
        if (editingIndex === null) {
            pastes.push({ name, text });
        } else if (pastes[editingIndex]) {
            pastes[editingIndex] = { name, text };
        } else {
            editingIndex = null;
            editor.reset();
            editor.hidden = true;
            addButton.hidden = false;
            renderList();
            return;
        }
        store.set(PASTES_KEY, pastes);
        editingIndex = null;
        editor.reset();
        editor.hidden = true;
        addButton.hidden = false;
        renderList();
    });

    renderList();
    document.addEventListener('keydown', onKeyDown, true);
    document.body.appendChild(overlay);
}