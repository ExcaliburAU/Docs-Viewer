let originalDocTitle = document.title;

let markedPromise = new Promise((resolve) => {
    if (typeof marked !== 'undefined') {
        resolve(marked);
    } else {
        window.addEventListener('load', () => resolve(marked));
    }
});

async function initializeMarked() {
    const marked = await markedPromise;
    
    const renderer = new marked.Renderer();
    const originalLink = renderer.link.bind(renderer);
    
    renderer.code = (code, language) => {
        let highlighted;
        if (language && hljs.getLanguage(language)) {
            highlighted = hljs.highlight(code, { language }).value;
            language = language;
        } else {
            highlighted = hljs.highlightAuto(code).value;
            language = '';
        }
        return `<pre class="hljs ${language ? "language-" + language : ""}"><code>${highlighted}</code></pre>`;
    };
    
    renderer.link = (href, title, text) => {
        const isExternal = href.startsWith('http') || href.startsWith('https');
        const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
        const link = originalLink(href, title, text);
        if (!isExternal && href.startsWith('?')) {
            return link.replace(/^<a /, '<a data-internal="true" ');
        }
        return link.replace(/^<a /, `<a${attrs} `);
    };

    marked.setOptions({
        breaks: true,
        gfm: true,
        renderer: renderer
    });

    return marked;
}

function createFileIndexItem(doc, container, level = 0) {
    if (doc.type === 'folder') {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder' + (doc.defaultOpen !== false ? ' open' : '');
        folderDiv.dataset.path = doc.title;
        folderDiv.style.paddingLeft = `${level * 0.8}rem`;

        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        
        const iconClass = doc.icon || `fas fa-folder${doc.defaultOpen !== false ? '-open' : ''}`;
        
        // Put file icon before folder icon
        const headerContent = doc.path ? 
            `<div class="folder-icons">
                <a href="?${doc.slug}" class="folder-link" title="View folder page">
                    <i class="fas fa-file-alt"></i>
                </a>
                 <i class="${iconClass} folder-icon"></i>
            </div>
            <span>${doc.title}</span>` :
            `<div class="folder-icons">
                <i class="${iconClass} folder-icon"></i>
            </div>
            <span>${doc.title}</span>`;
             
        folderHeader.innerHTML = headerContent;
        folderDiv.appendChild(folderHeader);

        const folderContent = document.createElement('div');
        folderContent.className = 'folder-content';
        doc.items.forEach(item => createFileIndexItem(item, folderContent, level + 1));
        folderDiv.appendChild(folderContent);

        // Make entire header toggle folder
        folderHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking the folder link
            if (e.target.closest('.folder-link')) {
                e.preventDefault();
                loadDocument(doc.path);
                history.pushState(null, '', `?${doc.slug}`);
                if (window.innerWidth <= 1000) {
                    document.querySelector('.left-sidebar').classList.remove('show');
                }
                return;
            }
            
            folderDiv.classList.toggle('open');
            if (!doc.icon) {
                folderHeader.querySelector('.folder-icon').classList.toggle('fa-folder-closed');
                folderHeader.querySelector('.folder-icon').classList.toggle('fa-folder-open');
            }
        });

        container.appendChild(folderDiv);
    } else {
        const link = document.createElement('a');
        link.href = `?${doc.slug}`;
        const displayTitle = doc.title || doc.path.split('/').pop().replace('.md', '');
        link.textContent = displayTitle;
        link.dataset.path = doc.path;
        link.style.paddingLeft = `${level * 0.8 + 1.2}rem`;
        
        link.onclick = (e) => {
            e.preventDefault();
            loadDocument(doc.path);
            history.pushState(null, '', link.href);
            const leftSidebar = document.querySelector('.left-sidebar');
            if (window.innerWidth <= 1000) {
                leftSidebar.classList.remove('show');
            }
        };
        container.appendChild(link);
    }
}

function findParentFolders(documents, path, parentFolders = []) {
    for (const doc of documents) {
        if (doc.type === 'folder') {
            const found = doc.items.find(item => {
                if (item.path === path) return true;
                if (item.type === 'folder') {
                    return findParentFolders([item], path).length > 0;
                }
                return false;
            });
            
            if (found) {
                parentFolders.push(doc);
                doc.items.forEach(item => {
                    if (item.type === 'folder') {
                        findParentFolders([item], path, parentFolders);
                    }
                });
            }
        }
    }
    return parentFolders;
}

function findDocumentBySlug(documents, slug) {
    for (const doc of documents) {
        if (doc.type === 'folder') {
            const found = findDocumentBySlug(doc.items, slug);
            if (found) return found;
        } else if (doc.slug === slug) {
            return doc;
        }
    }
    return null;
}

async function loadIndex() {
    try {
        const response = await fetch('index.json');
        const data = await response.json();
        const fileIndex = document.getElementById('file-index');
        
        fileIndex.innerHTML = '';
        
        data.documents.forEach(doc => createFileIndexItem(doc, fileIndex));

        const queryString = window.location.search;
        if (queryString) {
            const slug = queryString.substring(1);
            const matchingDoc = findDocumentBySlug(data.documents, slug);
            
            if (matchingDoc) {
                await loadDocument(matchingDoc.path);
            }
        } else {
            const defaultDoc = findDocumentBySlug(data.documents, 'welcome');
            if (defaultDoc) {
                await loadDocument(defaultDoc.path);
            }
        }
    } catch (error) {
        document.getElementById('document-content').innerHTML = 
            '<div class="error">Failed to load documentation index.</div>';
    }
}

window.addEventListener('popstate', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.toString().replace(/^=/, '').replace(/^\?/, '');
    if (slug) {
        const response = await fetch('index.json');
        const data = await response.json();
        const matchingDoc = findDocumentBySlug(data.documents, slug);
        if (matchingDoc) {
            await loadDocument(matchingDoc.path);
        }
    }
});

function extractMetadata(content) {
    const lines = content.trim().split('\n');
    let metadata = {};
    let contentStart = 0;

    if (lines[0].trim() === '---') {
        let endMetadata = -1;
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                endMetadata = i;
                break;
            }
            const line = lines[i].trim();
            if (line) {
                const match = line.match(/^([\w-]+):\s*(.*)$/);
                if (match) {
                    metadata[match[1]] = match[2].trim();
                }
            }
        }

        if (endMetadata !== -1) {
            contentStart = endMetadata + 1;
        }
    }

    return {
        metadata,
        content: lines.slice(contentStart).join('\n').trim()
    };
}

function findDocumentByTitle(documents, title) {
    for (const doc of documents) {
        if (doc.type === 'folder') {
            const found = findDocumentByTitle(doc.items, title);
            if (found) return found;
        } else if (doc.title === title || doc.path.endsWith(title + '.md')) {
            return doc;
        }
    }
    return null;
}

async function loadDocument(path) {
    try {
        const documentContent = document.getElementById('document-content');
        const documentOutline = document.getElementById('document-outline');
        const basePath = path.substring(0, path.lastIndexOf('/'));

        document.querySelectorAll('#file-index a').forEach(link => {
            link.classList.toggle('active', link.dataset.path === path);
            
            if (link.dataset.path === path) {
                const response = fetch('index.json')
                    .then(res => res.json())
                    .then(data => {
                        const parentFolders = findParentFolders(data.documents, path);
                        parentFolders.forEach(folder => {
                            const folderDiv = document.querySelector(`.folder[data-path="${folder.title}"]`);
                            if (folderDiv) {
                                folderDiv.classList.add('open');
                                const icon = folderDiv.querySelector('.folder-icon');
                                icon.classList.remove('fa-folder-closed');
                                icon.classList.add('fa-folder-open');
                            }
                        });
                    });
            }
        });

        const [response, marked] = await Promise.all([
            fetch(path),
            initializeMarked()
        ]);
        
        let rawContent = await response.text();
        const { metadata, content } = extractMetadata(rawContent);
        
        const indexResponse = await fetch('index.json');
        const indexData = await indexResponse.json();
        const docEntry = findDocumentByPath(indexData.documents, path);
        
        const titleContent = metadata.title || (docEntry && docEntry.title) || path.split('/').pop().replace('.md', '');
        
        document.title = `${originalDocTitle} / ${titleContent}`;
        document.querySelector('.title-text .page-title').textContent = titleContent;

        let processedContent = content.replace(/\[\[(.*?)\]\]/g, (match, linkText) => {
            if (linkText.match(/\.(png|jpg|jpeg|gif|mp4|webm)$/i)) {
                return match;
            }
            
            const doc = findDocumentByTitle(indexData.documents, linkText);
            if (doc) {
                return `[${doc.title}](?${doc.slug})`;
            }
            return match;
        });

        processedContent = `# ${titleContent}\n\n${processedContent}`;

        let finalContent = processedContent.replace(/!\[\[(.*?)\]\]/g, (match, filename) => {
            const mediaPath = `${basePath}/images/${filename}`;
            
            if (filename.toLowerCase().endsWith('.mp4')) {
                return `\n<video controls width="100%">
                    <source src="${mediaPath}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>\n\n`;
            }
            
            return `\n![${filename}](${mediaPath})\n\n`;
        });

        // Add Discord-style underline support: __text__ -> <u>text</u>
        finalContent = finalContent.replace(/__(.*?)__/g, '<u>$1</u>');

        document.querySelector('.title-text .page-title').textContent = titleContent;

        documentContent.className = 'markdown-content';
        documentContent.innerHTML = marked.parse(finalContent);
        hljs.highlightAll();

        documentOutline.innerHTML = '';
        const headings = documentContent.querySelectorAll('h2, h3, h4, h5, h6');
        const headingLinks = new Map();
        
        headings.forEach(heading => {
            if (!heading.id) {
                heading.id = heading.textContent.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');
            }
            
            const link = document.createElement('a');
            link.href = `${window.location.pathname}${window.location.search}#${heading.id}`;
            link.textContent = heading.textContent;
            link.style.paddingLeft = (heading.tagName[1] * 15) + 'px';
            headingLinks.set(heading, link);
            
            heading.style.scrollMarginTop = 'var(--title-bar-height)';

            link.onclick = (e) => {
                e.preventDefault();
                history.pushState(null, '', link.href);
                if (heading) {
                    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    heading.classList.remove('highlight');
                    void heading.offsetWidth;
                    heading.classList.add('highlight');
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
            
            documentOutline.appendChild(link);
            
            /* Add header folding toggle */
            const toggleBtn = document.createElement('span');
            toggleBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" style="transform: rotate(90deg); transition: transform 0.2s;">
                <path d="M3 2L7 5L3 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
            toggleBtn.style.cursor = 'pointer';
            toggleBtn.style.userSelect = 'none';
            toggleBtn.style.marginLeft = '0.5em';
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.style.alignItems = 'center';
            heading.appendChild(toggleBtn);
            
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const svg = toggleBtn.querySelector('svg');
                const isFolded = svg.style.transform === 'rotate(90deg)';
                svg.style.transform = isFolded ? 'rotate(0deg)' : 'rotate(90deg)';
                const currentLevel = parseInt(heading.tagName[1]);
                let next = heading.nextElementSibling;
                while (next) {
                    if (!/^H[1-6]$/.test(next.tagName)) {
                        next.style.display = isFolded ? 'none' : '';
                        next = next.nextElementSibling;
                    } else {
                        const nextLevel = parseInt(next.tagName[1]);
                        if (nextLevel <= currentLevel) {
                            break;
                        }
                        next.style.display = isFolded ? 'none' : '';
                        next = next.nextElementSibling;
                    }
                }
            });
        });

        const observer = new IntersectionObserver((entries) => {
            const visibleHeadings = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => a.target.offsetTop - b.target.offsetTop);
            if (visibleHeadings.length) {
                documentOutline.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                const topHeading = visibleHeadings[0].target;
                const link = headingLinks.get(topHeading);
                if (link) link.classList.add('active');
            }
        }, {
            rootMargin: '-48px 0px -60% 0px',
            threshold: [0, 0.25, 0.5, 0.75, 1]
        });

        headings.forEach(heading => observer.observe(heading));

        return () => observer.disconnect();

    } catch (error) {
        document.getElementById('document-content').innerHTML = 
            '<div class="error">Error loading document. Please try again.</div>';
    }
}

function findDocumentByPath(documents, path) {
    for (const doc of documents) {
        if (doc.type === 'folder') {
            const found = findDocumentByPath(doc.items, path);
            if (found) return found;
        } else if (doc.path === path) {
            return doc;
        }
    }
    return null;
}

function fixImagePaths(basePath, content) {
    return content.replace(/!\[\[(.*?)\]\]/g, (match, filename) => {
        const imagePath = basePath + '/images/' + filename;
        return `![${filename}](${imagePath})`;
    });
}

function setupMobileMenu() {
    const menuButton = document.querySelector('.menu-button');
    const leftSidebar = document.querySelector('.left-sidebar');
    const content = document.querySelector('.content');

    menuButton.addEventListener('click', () => {
        leftSidebar.classList.toggle('show');
    });

    content.addEventListener('click', () => {
        if (leftSidebar.classList.contains('show')) {
            leftSidebar.classList.remove('show');
        }
    });
}

window.addEventListener('load', () => {
    setupMobileMenu();
    loadIndex().catch(error => {
        document.getElementById('document-content').innerHTML = 
            '<div class="error">Failed to load documentation. Please try refreshing the page.</div>';
    });
});

document.addEventListener('click', async (e) => {
    const target = e.target.closest('a[data-internal="true"]');
    if (target) {
        e.preventDefault();
        const slug = target.href.split('?').pop();
        const indexData = await fetch('index.json').then(res => res.json());
        const matchingDoc = findDocumentBySlug(indexData.documents, slug);
        if (matchingDoc) {
            await loadDocument(matchingDoc.path);
            history.pushState(null, '', target.href);
        }
    }
});
