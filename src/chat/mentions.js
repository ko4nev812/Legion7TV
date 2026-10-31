const MENTION_RE = /(?<![\p{L}\p{N}_])@[a-z0-9_]{1,25}(?![\p{L}\p{N}_])/giu;

export function processMentions({ content, kind }) {
    if (kind !== 'message') return;

    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
        if (node.parentElement && node.parentElement.closest('a')) continue;
        const text = node.nodeValue;
        const matches = [...text.matchAll(MENTION_RE)];
        if (!matches.length) continue;

        const fragment = document.createDocumentFragment();
        let offset = 0;
        for (const match of matches) {
            const start = match.index;
            if (start > offset) fragment.appendChild(document.createTextNode(text.slice(offset, start)));
            const mention = document.createElement('span');
            mention.className = 't7-mention';
            mention.textContent = match[0];
            fragment.appendChild(mention);
            offset = start + match[0].length;
        }
        if (offset < text.length) fragment.appendChild(document.createTextNode(text.slice(offset)));
        node.replaceWith(fragment);
    }
}