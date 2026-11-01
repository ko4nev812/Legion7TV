import test from 'node:test';
import assert from 'node:assert/strict';
import { mutatePreservingScroll, getScrollState } from '../src/chat/scrollState.js';

test('updates preserve current reading position rather than restoring a stale scrollTop', (t) => {
    const original = globalThis.getComputedStyle;
    globalThis.getComputedStyle = () => ({ overflowY: 'auto' });
    t.after(() => { globalThis.getComputedStyle = original; });
    let offset = 0;
    const list = {
        nodeType: 1, parentElement: null, scrollTop: 200, scrollHeight: 1500, clientHeight: 400,
        matches: (selector) => !selector.startsWith('.dm-l'),
        getBoundingClientRect: () => ({ top: 0, bottom: 400 }),
        scrollTo({ top }) { this.scrollTop = Math.max(0, Math.min(top, this.scrollHeight - this.clientHeight)); }
    };
    const row = { isConnected: true, getBoundingClientRect: () => ({ top: offset, bottom: offset + 40 }) };
    list.children = [row];
    getScrollState(list);
    // Scrollbar dragging and inertia can move the view outside a short wheel-event window.
    list.scrollTop = 650;
    mutatePreservingScroll(list, () => {});
    assert.equal(list.scrollTop, 650);
    mutatePreservingScroll(list, () => { offset += 100; });
    assert.equal(list.scrollTop, 750, 'growth above the visible row keeps that row anchored');
    mutatePreservingScroll(list, () => {});
    assert.equal(list.scrollTop, 750, 'later updates do not jump back to an old value');
    list.scrollTop = 1100;
    mutatePreservingScroll(list, () => { list.scrollHeight += 200; });
    assert.equal(list.scrollTop, 1300, 'a reader at the bottom follows new content');
});

test('full list redraw finds the replacement visible message and uses instant scrolling', (t) => {
    const original = globalThis.getComputedStyle;
    globalThis.getComputedStyle = () => ({ overflowY: 'auto' });
    t.after(() => { globalThis.getComputedStyle = original; });
    const calls = [];
    const list = {
        nodeType: 1, parentElement: null, isConnected: true, scrollTop: 650, scrollHeight: 1500, clientHeight: 400,
        matches: (selector) => !selector.startsWith('.dm-l'),
        getBoundingClientRect: () => ({ top: 0, bottom: 400 }),
        scrollTo(options) { calls.push(options); this.scrollTop = options.top; }
    };
    const old = { isConnected: true, textContent: 'visible message', getBoundingClientRect: () => ({ top: -10, bottom: 50 }) };
    list.children = [old];
    mutatePreservingScroll(list, () => {
        old.isConnected = false;
        list.scrollTop = 300; // Browser clamps the position while the image is temporarily absent.
        list.children = [{ isConnected: true, textContent: 'visible message', getBoundingClientRect: () => ({ top: 340, bottom: 400 }) }];
    });
    assert.equal(list.scrollTop, 650);
    assert.equal(calls[0].behavior, 'instant');
    mutatePreservingScroll(list, () => {
        list.children[0].isConnected = false;
        list.children = [];
        list.scrollTop = 200;
    });
    assert.equal(list.scrollTop, 650, 'if the old message is deleted, preserve the current numeric offset');
});
