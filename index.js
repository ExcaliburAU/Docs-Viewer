class EventBus {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
    
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }
}

class IndexService {
    findDocumentBySlug(documents, slug) {
        for (const doc of documents) {
            if (doc.slug === slug) return doc;
            if (doc.type === 'folder') {
                const found = this.findDocumentBySlug(doc.items, slug);
                if (found) return found;
            }
        }
        return null;
    }

    findDocumentByTitle(documents, title) {
        for (const doc of documents) {
            if (doc.type === 'folder') {
                const found = this.findDocumentByTitle(doc.items, title);
                if (found) return found;
            } else if (doc.title === title || 
                      doc.path.endsWith(title + '.md') || 
                      doc.slug === title.toLowerCase().replace(/ /g, '-')) {
                return doc;
            }
        }
        return null;
    }

    findParentFolders(documents, path, parentFolders = []) {
        for (const doc of documents) {
            if (doc.type === 'folder') {
                const found = doc.items.find(item => {
                    if (item.path === path) return true;
                    if (item.type === 'folder') {
                        return this.findParentFolders([item], path).length > 0;
                    }
                    return false;
                });
                
                if (found) {
                    parentFolders.push(doc);
                    doc.items.forEach(item => {
                        if (item.type === 'folder') {
                            this.findParentFolders([item], path, parentFolders);
                        }
                    });
                }
            }
        }
        return parentFolders;
    }
}

class DOMService {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.elements = {
            content: document.getElementById('document-content'),
            outline: document.getElementById('document-outline'),
            fileIndex: document.getElementById('file-index'),
            titleText: document.querySelector('.title-text .page-title'),
            leftSidebar: document.querySelector('.left-sidebar'),
            menuButton: document.querySelector('.menu-button')
        };
    }

    setupMobileMenu() {
        this.elements.menuButton.addEventListener('click', () => 
            this.elements.leftSidebar.classList.toggle('show'));
            
        this.elements.content.addEventListener('click', () => 
            this.elements.leftSidebar.classList.remove('show'));
    }

    setContent(html) {
        this.elements.content.innerHTML = html;
        this.elements.content.className = 'markdown-content';
        hljs.highlightAll();
    }

    setTitle(title) {
        document.title = `${window.originalDocTitle} / ${title}`;
        this.elements.titleText.textContent = title;
    }

    setError(message) {
        this.elements.content.innerHTML = `<div class="error">${message}</div>`;
    }

    createFileIndexItem(doc, container, level = 0) {
        if (doc.type === 'folder') {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder' + (doc.defaultOpen !== false ? ' open' : '');
            folderDiv.dataset.path = doc.title;
            folderDiv.style.paddingLeft = `${level * 0.8}rem`;

            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            
            const iconClass = doc.icon || `fas fa-folder${doc.defaultOpen !== false ? '-open' : ''}`;
            
            folderHeader.innerHTML = doc.path ? 
                this.createFolderHeaderWithFile(iconClass, doc) :
                this.createFolderHeaderBasic(iconClass, doc);

            this.setupFolderListeners(folderDiv, folderHeader, doc);
            
            const folderContent = document.createElement('div');
            folderContent.className = 'folder-content';
            doc.items.forEach(item => this.createFileIndexItem(item, folderContent, level + 1));
            
            folderDiv.appendChild(folderHeader);
            folderDiv.appendChild(folderContent);
            container.appendChild(folderDiv);
        } else {
            this.createFileItem(doc, container, level);
        }
    }

    createFileItem(doc, container, level) {
        const link = document.createElement('a');
        link.href = `?${doc.slug}`;
        link.textContent = doc.title || doc.path.split('/').pop().replace('.md', '');
        link.dataset.path = doc.path;
        link.style.paddingLeft = `${level * 0.8 + 1.2}rem`;
        
        link.onclick = (e) => {
            e.preventDefault();
            this.eventBus.emit('navigation:requested', { slug: doc.slug });
            history.pushState(null, '', link.href);
            if (window.innerWidth <= 1000) {
                this.elements.leftSidebar.classList.remove('show');
            }
        };
        
        container.appendChild(link);
    }

    updateActiveDocument(path) {
        this.elements.fileIndex.querySelectorAll('a').forEach(link => {
            link.classList.toggle('active', link.dataset.path === path);
        });
    }

    createOutline(headings) {
        this.elements.outline.innerHTML = '';
        const headingLinks = new Map();
        
        headings.forEach(heading => {
            if (!heading.id) {
                heading.id = heading.textContent.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');
            }
            
            const link = this.createOutlineLink(heading);
            headingLinks.set(heading, link);
            this.elements.outline.appendChild(link);
            this.addHeadingFoldToggle(heading);
        });

        return headingLinks;
    }

    createFolderHeaderWithFile(iconClass, doc) {
        return `<div class="folder-icons">
            <a href="?${doc.slug}" class="folder-link" title="View folder page">
                <i class="fas fa-file-alt"></i>
            </a>
            <i class="${iconClass} folder-icon"></i>
        </div>
        <span>${doc.title}</span>`;
    }

    createFolderHeaderBasic(iconClass, doc) {
        return `<div class="folder-icons">
            <i class="${iconClass} folder-icon"></i>
        </div>
        <span>${doc.title}</span>`;
    }

    setupFolderListeners(folderDiv, folderHeader, doc) {
        folderHeader.addEventListener('click', (e) => {
            if (e.target.closest('.folder-link')) {
                e.preventDefault();
                this.eventBus.emit('navigation:requested', { slug: doc.slug });
                history.pushState(null, '', `?${doc.slug}`);
                if (window.innerWidth <= 1000) {
                    this.elements.leftSidebar.classList.remove('show');
                }
                return;
            }
            
            folderDiv.classList.toggle('open');
            if (!doc.icon) {
                const icon = folderHeader.querySelector('.folder-icon');
                icon.classList.toggle('fa-folder-closed');
                icon.classList.toggle('fa-folder-open');
            }
        });
    }

    createOutlineLink(heading) {
        const link = document.createElement('a');
        link.href = `${window.location.pathname}${window.location.search}#${heading.id}`;
        link.textContent = heading.textContent;
        link.style.paddingLeft = (heading.tagName[1] * 15) + 'px';
        
        link.onclick = (e) => {
            e.preventDefault();
            history.pushState(null, '', link.href);
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            heading.classList.remove('highlight');
            void heading.offsetWidth;
            heading.classList.add('highlight');
        };
        
        return link;
    }

    addHeadingFoldToggle(heading) {
        const toggleBtn = document.createElement('span');
        toggleBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" style="transform: rotate(90deg); transition: transform 0.2s;">
            <path d="M3 2L7 5L3 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.userSelect = 'none';
        toggleBtn.style.marginLeft = '0.5em';
        toggleBtn.style.display = 'inline-flex';
        toggleBtn.style.alignItems = 'center';
        
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const svg = toggleBtn.querySelector('svg');
            const isFolded = svg.style.transform === 'rotate(90deg)';
            svg.style.transform = isFolded ? 'rotate(0deg)' : 'rotate(90deg)';
            
            let next = heading.nextElementSibling;
            const currentLevel = parseInt(heading.tagName[1]);
            
            while (next) {
                if (!/^H[1-6]$/.test(next.tagName)) {
                    next.style.display = isFolded ? 'none' : '';
                    next = next.nextElementSibling;
                } else {
                    const nextLevel = parseInt(next.tagName[1]);
                    if (nextLevel <= currentLevel) break;
                    next.style.display = isFolded ? 'none' : '';
                    next = next.nextElementSibling;
                }
            }
        });
        
        heading.appendChild(toggleBtn);
    }
}

class DocumentService {
    constructor(eventBus, indexService) {
        this.eventBus = eventBus;
        this.indexService = indexService;
        this.markedPromise = this.initializeMarked();
    }

    async initializeMarked() {
        const marked = await new Promise((resolve) => {
            if (typeof window.marked !== 'undefined') {
                resolve(window.marked);
            } else {
                window.addEventListener('load', () => resolve(window.marked));
            }
        });

        const renderer = new marked.Renderer();
        this.setupRenderer(renderer);
        
        marked.setOptions({
            breaks: true,
            gfm: true,
            renderer: renderer
        });

        return marked;
    }

    setupRenderer(renderer) {
        const originalLink = renderer.link.bind(renderer);
        
        renderer.code = this.renderCode;
        renderer.link = (href, title, text) => {
            const isExternal = href.startsWith('http');
            const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            const link = originalLink(href, title, text);
            if (!isExternal && href.startsWith('?')) {
                return link.replace(/^<a /, '<a data-internal="true" ');
            }
            return link.replace(/^<a /, `<a${attrs} `);
        };
    }

    renderCode(code, language) {
        let highlighted;
        if (language && hljs.getLanguage(language)) {
            highlighted = hljs.highlight(code, { language }).value;
        } else {
            highlighted = hljs.highlightAuto(code).value;
            language = '';
        }
        return `<pre class="hljs ${language ? "language-" + language : ""}"><code>${highlighted}</code></pre>`;
    }

    extractMetadata(content) {
        const lines = content.trim().split('\n');
        let metadata = {};
        let contentStart = 0;

        if (lines[0].trim() === '---') {
            let endMetadata = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
            if (endMetadata !== -1) {
                metadata = Object.fromEntries(
                    lines.slice(1, endMetadata)
                        .map(line => line.match(/^([\w-]+):\s*(.*)$/))
                        .filter(Boolean)
                        .map(([, key, value]) => [key, value.trim()])
                );
                contentStart = endMetadata + 1;
            }
        }

        return {
            metadata,
            content: lines.slice(contentStart).join('\n').trim()
        };
    }

    async loadDocument(path) {
        try {
            const [response, marked] = await Promise.all([
                fetch(path),
                this.markedPromise
            ]);
            
            let rawContent = await response.text();
            const { metadata, content } = this.extractMetadata(rawContent);
            const basePath = path.substring(0, path.lastIndexOf('/'));
            const indexDoc = this.findDocInIndex(path);
            
            let processedContent = this.processWikiLinks(content);
            processedContent = this.processImages(processedContent, basePath);
            const titleContent = metadata.title || indexDoc?.title || path.split('/').pop().replace('.md', '');
            processedContent = this.ensureTitle(processedContent, titleContent);
            
            return {
                content: processedContent,
                metadata,
                marked,
                title: titleContent
            };
        } catch (error) {
            throw new Error('Failed to load document');
        }
    }

    findDocInIndex(path) {
        let doc = window._indexData.documents.find(d => d.path === path);
        
        if (!doc) {
            for (const d of window._indexData.documents) {
                if (d.type === 'folder' && d.items) {
                    doc = d.items.find(item => item.path === path);
                    if (doc) break;
                }
            }
        }
        return doc;
    }

    ensureTitle(content, title) {
        content = content.replace(/^#\s+.*$/m, '').trim();
        return `# ${title}\n\n${content}`;
    }

    processWikiLinks(content) {
        return content.replace(/\[\[(.*?)\]\]/g, (match, linkText) => {
            const [targetTitle, displayText] = linkText.split('|').map(s => s.trim());
            if (targetTitle.match(/\.(png|jpg|jpeg|gif|mp4|webm)$/i)) {
                return match;
            }

            const doc = this.indexService.findDocumentByTitle(
                window._indexData.documents, 
                targetTitle
            );
            return doc ? `[${displayText || doc.title}](?${doc.slug})` : match;
        });
    }

    processImages(content, basePath) {
        return content.replace(/!\[\[(.*?)\]\]/g, (match, filename) => {
            const mediaPath = `${basePath}/images/${filename}`;
            
            if (filename.toLowerCase().endsWith('.mp4')) {
                return `\n<video controls width="100%">
                    <source src="${mediaPath}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>\n\n`;
            }
            
            return `\n![${filename}](${mediaPath})\n\n`;
        });
    }
}

class NavigationService {
    constructor(eventBus, documentService) {
        this.eventBus = eventBus;
        this.documentService = documentService;
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('popstate', async () => {
            const slug = new URLSearchParams(window.location.search).toString()
                .replace(/^=/, '').replace(/^\?/, '');
            this.eventBus.emit('navigation:requested', { slug });
        });

        document.addEventListener('click', async (e) => {
            const target = e.target.closest('a[data-internal="true"]');
            if (target) {
                e.preventDefault();
                const slug = target.href.split('?').pop();
                history.pushState({ slug }, '', target.href);
                this.eventBus.emit('navigation:requested', { slug });
            }
        });
    }
}

class Documentation {
    constructor() {
        this.eventBus = new EventBus();
        this.indexService = new IndexService();
        this.domService = new DOMService(this.eventBus);
        this.documentService = new DocumentService(this.eventBus, this.indexService);
        this.navigationService = new NavigationService(this.eventBus, this.documentService);
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventBus.on('navigation:requested', async ({ slug }) => {
            slug = slug.replace(/^[?=]/, '');
            await this.loadDocumentBySlug(slug);
        });

        this.eventBus.on('document:load', async ({ path }) => {
            await this.loadDocument(path);
        });

        window.addEventListener('load', () => {
            this.domService.setupMobileMenu();
            this.initialize();
        });

        document.addEventListener('click', async (e) => {
            const target = e.target.closest('a[data-internal="true"]');
            if (target) {
                e.preventDefault();
                const slug = target.href.split('?').pop();
                history.pushState(null, '', target.href);
                await this.loadDocumentBySlug(slug);
            }
        });
    }

    async initialize() {
        try {
            const response = await fetch('index.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.indexData = data;
            window._indexData = data;

            this.domService.elements.fileIndex.innerHTML = '';
            this.indexData.documents.forEach(doc => 
                this.domService.createFileIndexItem(doc, this.domService.elements.fileIndex));

            const urlParams = new URLSearchParams(window.location.search);
            const slug = urlParams.get('') || urlParams.get('page') || 'welcome';
            await this.loadDocumentBySlug(slug);
        } catch (error) {
            this.domService.setError(`Failed to load documentation index: ${error.message}`);
        }
    }

    async loadDocumentBySlug(slug) {
        const doc = this.indexService.findDocumentBySlug(this.indexData.documents, slug);
        
        if (!doc) {
            this.domService.setError(`Document not found: ${slug}`);
            return;
        }

        if (doc.type === 'folder') {
            if (doc.path) {
                await this.loadDocument(doc.path);
            } else if (doc.items?.length > 0) {
                await this.loadDocument(doc.items[0].path);
            } else {
                this.domService.setError('This folder is empty.');
            }
            return;
        }

        await this.loadDocument(doc.path);
    }

    async loadDocument(path) {
        try {
            const { content, metadata, marked, title } = await this.documentService.loadDocument(path);
            
            this.domService.setTitle(title);
            this.domService.setContent(marked.parse(content));
            this.domService.updateActiveDocument(path);
            
            const headings = document.querySelectorAll('h2, h3, h4, h5, h6');
            const headingLinks = this.domService.createOutline(headings);
            
            this.setupScrollObserver(headings, headingLinks);
            
            window._currentPath = path;

            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            this.domService.setError('Error loading document. Please try again.');
        }
    }

    setupScrollObserver(headings, headingLinks) {
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleHeadings = entries
                    .filter(entry => entry.isIntersecting)
                    .sort((a, b) => a.target.offsetTop - b.target.offsetTop);

                if (visibleHeadings.length) {
                    this.domService.elements.outline
                        .querySelectorAll('a')
                        .forEach(a => a.classList.remove('active'));
                    
                    const link = headingLinks.get(visibleHeadings[0].target);
                    if (link) link.classList.add('active');
                }
            },
            {
                rootMargin: '-48px 0px -60% 0px',
                threshold: [0, 0.25, 0.5, 0.75, 1]
            }
        );

        headings.forEach(heading => observer.observe(heading));
        return observer;
    }
}

window.originalDocTitle = document.title;
const docs = new Documentation();
