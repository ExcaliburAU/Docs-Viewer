fetch('index.json')
    .then(response => response.json())
    .then(data => {
        document.title = data.metadata.title || 'Documentation';
    })
    .catch(error => {
        console.error('Error loading title:', error);
        document.title = 'Documentation';
    });

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

class SearchService {
    constructor(eventBus, indexService) {
        this.eventBus = eventBus;
        this.indexService = indexService;
        this.searchIndex = [];
    }

    buildSearchIndex(documents) {
        this.searchIndex = [];
        this.processDocuments(documents);
    }

    processDocuments(documents, parentPath = '') {
        documents.forEach(doc => {
            if (doc.type === 'folder') {
                const currentPath = parentPath ? `${parentPath} / ${doc.title}` : doc.title;
                if (doc.path) {
                    if (doc.showfolderpage !== 'false') {
                        this.searchIndex.push({
                            title: doc.title,
                            path: doc.path,
                            slug: doc.slug,
                            location: currentPath,
                            type: 'folder'
                        });
                    }

                    if (doc.headers) {
                        doc.headers.forEach(header => {
                            this.searchIndex.push({
                                title: header,
                                path: doc.path,
                                slug: `${doc.slug}#${header.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`,
                                location: `${currentPath} / ${doc.title}`,
                                type: 'header'
                            });
                        });
                    }
                }
                if (doc.items) {
                    this.processDocuments(doc.items, currentPath);
                }
            } else {
                this.searchIndex.push({
                    title: doc.title,
                    path: doc.path,
                    slug: doc.slug,
                    location: parentPath,
                    type: 'file'
                });

                if (doc.headers) {
                    doc.headers.forEach(header => {
                        this.searchIndex.push({
                            title: header,
                            path: doc.path,
                            slug: `${doc.slug}#${header.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`,
                            location: `${parentPath} / ${doc.title}`,
                            type: 'header'
                        });
                    });
                }
            }
        });
    }

    search(query) {
        if (!query) return [];
        query = query.toLowerCase();

        return this.searchIndex
            .map(item => {
                const titleLower = item.title.toLowerCase();
                let score = 0;

                if (titleLower === query) score = 100;
                else if (titleLower.startsWith(query)) score = 80;
                else if (titleLower.includes(query)) score = 60;
                else if (item.path.toLowerCase().includes(query)) score = 40;
                else if (item.location.toLowerCase().includes(query)) score = 20;

                if (item.type === 'header') score += 5;

                return { ...item, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
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
            menuButton: document.querySelector('.menu-button'),
            header: document.querySelector('title-bar'),
            searchInput: document.getElementById('search-input'),
            searchResults: document.getElementById('search-results'),
            clearSearch: document.getElementById('clear-search')
        };
        this.headerOffset = 60;
    }

    setupMobileMenu() {
        this.elements.menuButton.addEventListener('click', () => {
            const isExpanded = this.elements.leftSidebar.classList.toggle('show');
            this.elements.menuButton.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        });

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
            // Ensure defaultOpen is handled as a boolean
            const isOpen = doc.defaultOpen === true;
            folderDiv.className = 'folder' + (isOpen ? ' open' : '');
            folderDiv.dataset.path = doc.title;
            folderDiv.style.paddingLeft = `${level * 0.8}rem`;

            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            folderHeader.setAttribute('role', 'treeitem');
            // Update aria-expanded to match the new isOpen state
            folderHeader.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            folderHeader.setAttribute('tabindex', '0');
            // Update icon class to match the folded state
            const iconClass = doc.icon || `fas fa-folder${isOpen ? '-open' : ''}`;

            // Only add folder click handler if showfolderpage is not false
            if (doc.path && doc.metadata?.showfolderpage !== false) {
                folderHeader.innerHTML = this.createFolderHeaderWithFile(iconClass, doc);
                this.setupFolderListeners(folderDiv, folderHeader, doc);
            } else {
                folderHeader.innerHTML = this.createFolderHeaderBasic(iconClass, doc);
                // Only setup the folder open/close functionality
                folderHeader.addEventListener('click', () => {
                    folderDiv.classList.toggle('open');
                    const isExpanded = folderDiv.classList.contains('open');
                    folderHeader.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
                    if (!doc.icon) {
                        const icon = folderHeader.querySelector('.folder-icon');
                        icon.classList.toggle('fa-folder-closed');
                        icon.classList.toggle('fa-folder-open');
                    }
                });
                
                // Add keyboard accessibility
                folderHeader.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        folderHeader.click();
                    }
                });
            }

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
        link.style.paddingLeft = `${(level * 0.6) + 0.8}rem`;  // Add base padding of 0.8rem
        link.setAttribute('role', 'treeitem');

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
        const showFolderPage = doc.showfolderpage !== 'false';
        return `
            <div class="folder-icons">
                <i class="${iconClass} folder-icon" aria-hidden="true"></i>
            </div>
            <span>${doc.title}</span>
            ${showFolderPage ? `
                <a href="?${doc.slug}" class="folder-link" title="View folder page" aria-label="View ${doc.title} folder page">
                    <i class="fas fa-file-alt" aria-hidden="true"></i>
                </a>` : ''}`;
    }

    createFolderHeaderBasic(iconClass, doc) {
        return `
            <div class="folder-icons">
                <i class="${iconClass} folder-icon" aria-hidden="true"></i>
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
            const isExpanded = folderDiv.classList.contains('open');
            folderHeader.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            if (!doc.icon) {
                const icon = folderHeader.querySelector('.folder-icon');
                icon.classList.toggle('fa-folder-closed');
                icon.classList.toggle('fa-folder-open');
            }
        });
        
        // Add keyboard support
        folderHeader.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (e.target.closest('.folder-link')) {
                    e.target.closest('.folder-link').click();
                } else {
                    folderHeader.click();
                }
            }
        });
    }

    scrollToElement(element) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const absoluteElementTop = rect.top + window.scrollY;
        const middle = absoluteElementTop - (this.headerOffset + 20); // Add extra padding

        window.scrollTo({
            top: middle,
            behavior: 'smooth'
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
            this.scrollToElement(heading);
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

    setupSearch(searchService) {
        let searchTimeout;

        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value;

            searchTimeout = setTimeout(() => {
                const results = searchService.search(query);
                this.renderSearchResults(results);
            }, 200);
        });

        this.elements.clearSearch.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.elements.searchResults.innerHTML = '';
            this.elements.searchResults.style.display = 'none';
            // Announce to screen readers
            this.elements.searchResults.setAttribute('aria-hidden', 'true');
        });
    }

    renderSearchResults(results) {
        const container = this.elements.searchResults;
        container.innerHTML = '';

        if (results.length === 0 || !this.elements.searchInput.value) {
            container.style.display = 'none';
            container.setAttribute('aria-hidden', 'true');
            return;
        }

        // Update for screen readers
        container.setAttribute('aria-hidden', 'false');
        if (results.length === 1) {
            container.setAttribute('aria-label', '1 search result found');
        } else {
            container.setAttribute('aria-label', `${results.length} search results found`);
        }

        results.forEach(result => {
            const div = document.createElement('div');
            div.className = 'search-result';

            const icon = document.createElement('i');
            icon.className = result.type === 'folder' ? 'fas fa-folder' :
                result.type === 'header' ? 'fas fa-hashtag' :
                    'fas fa-file-alt';

            const link = document.createElement('a');
            link.href = `?${result.slug}`;
            link.innerHTML = `
                ${icon.outerHTML}
                <div class="search-result-content">
                    <div class="search-result-title">${result.title}</div>
                    <div class="search-result-path">${result.location}</div>
                </div>
            `;

            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.elements.searchInput.value = '';
                container.style.display = 'none';
                const [baseSlug, hash] = result.slug.split('#');
                history.pushState(null, '', link.href);
                this.eventBus.emit('navigation:requested', {
                    slug: baseSlug,
                    hash: hash ? `#${hash}` : '',
                    fromSearch: true  // Add this flag
                });
            });

            div.appendChild(link);
            container.appendChild(div);
        });

        container.style.display = 'block';
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

        const originalHeading = renderer.heading.bind(renderer);
        renderer.heading = (text, level) => {
            const escapedText = text.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');

            const id = escapedText;

            return `<h${level} id="${id}" class="clickable-header">
                ${text}
            </h${level}>`;
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
                // Extract and convert frontmatter types
                const frontmatterEntries = lines.slice(1, endMetadata)
                    .map(line => line.match(/^([\w-]+):\s*(.*)$/))
                    .filter(Boolean)
                    .map(([, key, value]) => {
                        // Convert specific properties to their proper types
                        if (key === 'defaultOpen') {
                            return [key, value.trim().toLowerCase() === 'true'];
                        } 
                        else if (key === 'sort') {
                            return [key, parseInt(value.trim(), 10)];
                        }
                        else {
                            return [key, value.trim()];
                        }
                    });
                
                metadata = Object.fromEntries(frontmatterEntries);
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
            
            // Ensure proper types for metadata properties
            if (metadata.defaultOpen !== undefined) {
                metadata.defaultOpen = metadata.defaultOpen === true || metadata.defaultOpen === 'true';
            }
            
            if (metadata.sort !== undefined) {
                metadata.sort = typeof metadata.sort === 'number' ? metadata.sort : parseInt(metadata.sort, 10);
            }
            
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
            const mediaPath = `./docs/images/${filename}`;

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
            const search = window.location.search;
            const hash = window.location.hash;
            const slug = (search === '' || search === '?') ?
                window._indexData.defaultPage :
                search.replace(/^\?/, '').split('#')[0];

            this.eventBus.emit('navigation:requested', { slug, hash });
        });

        document.addEventListener('click', async (e) => {
            const target = e.target.closest('a[data-internal="true"]');
            if (target) {
                e.preventDefault();
                const slug = target.href.split('?').pop();
                history.pushState(null, '', `?${slug}`);
                this.eventBus.emit('navigation:requested', { slug });
            }
        });
    }
}

class Documentation {
    constructor() {
        this.eventBus = new EventBus();
        this.indexService = new IndexService();
        this.searchService = new SearchService(this.eventBus, this.indexService);
        this.domService = new DOMService(this.eventBus);
        this.documentService = new DocumentService(this.eventBus, this.indexService);
        this.navigationService = new NavigationService(this.eventBus, this.documentService);

        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    /**
     * Loads a custom CSS file if specified in the index.json
     * @param {string} customCSSPath - Path to the custom CSS file relative to document root
     */
    loadCustomCSS(customCSSPath) {
        if (!customCSSPath) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = customCSSPath; // Path is relative to document root
        document.head.appendChild(link);
    }

    setupEventListeners() {
        this.eventBus.on('navigation:requested', async ({ slug, hash }) => {
            slug = slug.replace(/^[?=]/, '');
            await this.loadDocumentBySlug(slug, hash);
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
    
    setupKeyboardShortcuts() {
        // Add keyboard shortcut for search (S key)
        document.addEventListener('keydown', (e) => {
            // Only trigger if user is not typing in an input, textarea, or contenteditable element
            const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                           document.activeElement.isContentEditable;
            
            // Search shortcut (S key or Alt+S)                   
            if (((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && 
                (!e.altKey || (e.altKey && (e.key === 's' || e.key === 'S')))) && 
                !isTyping) {
                e.preventDefault();
                
                // Focus the search input
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    
                    // If sidebar is closed on mobile, open it
                    const leftSidebar = document.querySelector('.left-sidebar');
                    const menuButton = document.querySelector('.menu-button');
                    if (window.innerWidth <= 1000 && leftSidebar && 
                        !leftSidebar.classList.contains('show')) {
                        leftSidebar.classList.add('show');
                        if (menuButton) {
                            menuButton.setAttribute('aria-expanded', 'true');
                        }
                    }
                }
            }
            
            // Navigation with Alt+Up/Down to move between pages
            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey && !isTyping) {
                e.preventDefault();
                
                // Get all links from the file index
                const fileLinks = Array.from(document.querySelectorAll('#file-index a'));
                if (fileLinks.length === 0) return;
                
                // Find the current active link
                const activeLink = document.querySelector('#file-index a.active');
                if (!activeLink) return;
                
                // Find the index of the active link
                const activeIndex = fileLinks.indexOf(activeLink);
                if (activeIndex === -1) return;
                
                // Determine the target link based on direction
                let targetLink;
                if (e.key === 'ArrowDown') {
                    // Go to next link (or first if at the end)
                    targetLink = activeIndex < fileLinks.length - 1 ? 
                        fileLinks[activeIndex + 1] : 
                        fileLinks[0];
                } else {
                    // Go to previous link (or last if at the beginning)
                    targetLink = activeIndex > 0 ? 
                        fileLinks[activeIndex - 1] : 
                        fileLinks[fileLinks.length - 1];
                }
                
                // Navigate to the target page
                if (targetLink) {
                    // Simulate a click on the link
                    targetLink.click();
                    
                    // Ensure the target link is visible in the sidebar
                    targetLink.scrollIntoView({ block: 'nearest' });
                }
            }
        });
    }

    async initialize() {
        try {
            const response = await fetch('index.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            this.indexData = data;
            window._indexData = data;

            // Load custom CSS if provided in index.json
            if (data.customCSS) {
                this.loadCustomCSS(data.customCSS);
            }

            this.searchService.buildSearchIndex(this.indexData.documents);
            this.domService.setupSearch(this.searchService);

            this.populateAuthorInfo(data.author);
            window.originalDocTitle = data.metadata.site_name || 'Documentation';
            document.title = window.originalDocTitle;

            this.domService.elements.fileIndex.innerHTML = '';
            this.indexData.documents.forEach(doc =>
                this.domService.createFileIndexItem(doc, this.domService.elements.fileIndex));

            const search = window.location.search;
            const slug = search === '' || search === '?'
                ? this.indexData.defaultPage
                : search.replace(/^\?/, '');

            await this.loadDocumentBySlug(slug);

            if (window.location.hash) {
                setTimeout(() => {
                    const element = document.getElementById(window.location.hash.slice(1));
                    if (element) this.domService.scrollToElement(element);
                }, 100);
            }
        } catch (error) {
            this.domService.setError(`Failed to load documentation index: ${error.message}`);
        }
    }

    populateAuthorInfo(author) {
        const subtitleName = document.querySelector('.name');
        const subtitleRole = document.querySelector('.role');
        if (!subtitleName || !subtitleRole) return;

        subtitleName.textContent = author.name || '';
        subtitleRole.textContent = author.role || '';

        const socials = document.querySelector('.social-links');
        if (socials) {
            socials.innerHTML = '';
            if (author.socials) {
                author.socials.forEach(s => {
                    const link = document.createElement('a');
                    link.href = s.url;
                    link.target = '_blank';
                    link.title = s.title;
                    link.innerHTML = `<i class="${s.icon}"></i>`;
                    socials.appendChild(link);
                });
            }
        }
    }

    async loadDocumentBySlug(slug, hash) {
        const [baseSlug] = slug.split('#');
        const doc = this.indexService.findDocumentBySlug(this.indexData.documents, baseSlug);

        if (!doc) {
            this.domService.setError(`Document not found: ${baseSlug}`);
            return;
        }

        if (doc.type === 'folder') {
            if (doc.path) {
                await this.loadDocument(doc.path, hash);
            } else if (doc.items?.length > 0) {
                await this.loadDocument(doc.items[0].path, hash);
            } else {
                this.domService.setError('This folder is empty.');
            }
            return;
        }

        await this.loadDocument(doc.path, hash);
    }

    async loadDocument(path, hash, fromSearch = false) {
        try {
            const { content, metadata, marked, title } = await this.documentService.loadDocument(path);

            this.domService.setTitle(title);
            this.domService.setContent(marked.parse(content));
            this.domService.updateActiveDocument(path);

            const headings = document.querySelectorAll('h2, h3, h4, h5, h6');
            const headingLinks = this.domService.createOutline(headings);

            headings.forEach(heading => {
                heading.addEventListener('click', (e) => {
                    if (e.target.closest('svg') || e.target.closest('.header-anchor')) return;

                    const id = heading.id;
                    if (id) {
                        history.pushState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
                        this.domService.scrollToElement(heading);
                        heading.classList.remove('highlight');
                        void heading.offsetWidth;
                        heading.classList.add('highlight');
                    }
                });
            });

            this.setupScrollObserver(headings, headingLinks);

            window._currentPath = path;

            if (hash) {
                const element = document.getElementById(hash.slice(1));
                if (element) {
                    const delay = fromSearch ? 300 : 100;
                    setTimeout(() => {
                        this.domService.scrollToElement(element);
                        element.classList.remove('highlight');
                        void element.offsetWidth;
                        element.classList.add('highlight');
                    }, delay);
                }
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
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
