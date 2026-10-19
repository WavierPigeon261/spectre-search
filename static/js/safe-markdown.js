(() => {
    const allowedTags = new Set([
        'A', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'EM', 'H1', 'H2', 'H3',
        'H4', 'H5', 'H6', 'HR', 'LI', 'OL', 'P', 'PRE', 'STRONG',
        'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'UL'
    ]);
    const blockedTags = new Set([
        'IFRAME', 'MATH', 'OBJECT', 'SCRIPT', 'STYLE', 'SVG', 'TEMPLATE'
    ]);

    function sanitizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.nodeValue);
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return document.createDocumentFragment();
        }

        const tag = node.tagName;
        if (blockedTags.has(tag)) {
            return document.createDocumentFragment();
        }

        const fragment = document.createDocumentFragment();
        if (!allowedTags.has(tag)) {
            node.childNodes.forEach(child => fragment.appendChild(sanitizeNode(child)));
            return fragment;
        }

        const clean = document.createElement(tag.toLowerCase());
        if (tag === 'A') {
            const href = node.getAttribute('href');
            if (href) {
                try {
                    const url = new URL(href, document.baseURI);
                    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
                        clean.href = url.href;
                        clean.rel = 'noopener noreferrer';
                        clean.target = '_blank';
                    }
                } catch {
                    // Invalid links are rendered as non-clickable text.
                }
            }
            const title = node.getAttribute('title');
            if (title) clean.title = title;
        }
        node.childNodes.forEach(child => clean.appendChild(sanitizeNode(child)));
        return clean;
    }

    window.renderSafeMarkdown = function (target, markdown) {
        const parsed = document.createElement('template');
        parsed.innerHTML = marked.parse(String(markdown ?? ''));

        const safeContent = document.createDocumentFragment();
        parsed.content.childNodes.forEach(node => safeContent.appendChild(sanitizeNode(node)));
        target.replaceChildren(safeContent);
    };
})();
