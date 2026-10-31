import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveImage } from '../src/chat/images.js';

test('Postimages downloads use CSP-compatible blob URLs and preserve GIF bytes', async (t) => {
    const originalRequest = globalThis.GM_xmlhttpRequest;
    const originalParser = globalThis.DOMParser;
    const urls = [];
    t.after(() => {
        globalThis.GM_xmlhttpRequest = originalRequest;
        globalThis.DOMParser = originalParser;
        urls.forEach((url) => URL.revokeObjectURL(url));
    });
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    const requests = [];
    let binaryMode = 'ok';
    // Isolate the download boundary from HTML parsing and the Tampermonkey runtime.
    globalThis.DOMParser = class {
        parseFromString(source) {
            return { querySelector: (selector) => selector === '#main-image'
                ? { getAttribute: () => source } : null };
        }
    };
    globalThis.GM_xmlhttpRequest = (request) => {
        requests.push(request);
        queueMicrotask(() => {
            if (request.responseType !== 'arraybuffer') {
                request.onload({ status: 200, responseText: 'https://i.postimg.cc/test/original.gif' });
            } else if (binaryMode === 'timeout') request.ontimeout();
            else request.onload({
                status: binaryMode === 'missing' ? 404 : 200,
                responseHeaders: binaryMode === 'html' ? 'Content-Type: text/html\r\n' : 'Content-Type: image/gif\r\n',
                response: binaryMode === 'empty' ? new ArrayBuffer(0) : gif.buffer.slice(gif.byteOffset, gif.byteOffset + gif.byteLength)
            });
        });
    };

    const first = resolveImage('gifTest');
    assert.equal(resolveImage('gifTest'), first, 'concurrent requests share the same download');
    const url = await first;
    urls.push(url);
    assert(url.startsWith('blob:'), 'img-src self data: blob: permits the resulting URL');
    const response = await fetch(url);
    assert.equal(response.headers.get('content-type'), 'image/gif');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), gif);
    assert.equal(requests.length, 2, 'one page request and one binary request');
    assert.equal(requests[1].url, 'https://i.postimg.cc/test/original.gif');
    assert.equal(requests[1].responseType, 'arraybuffer');
    assert.equal(await resolveImage('gifTest'), url, 'completed downloads are reused');

    for (const mode of ['missing', 'html', 'empty', 'timeout']) {
        binaryMode = mode;
        await assert.rejects(resolveImage('fail' + mode), /Ошибка Postimages/);
    }
    binaryMode = 'ok';
    const retried = await resolveImage('failmissing');
    urls.push(retried);
    assert(retried.startsWith('blob:'), 'failed downloads may be retried');
});
