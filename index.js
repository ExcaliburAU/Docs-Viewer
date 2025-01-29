let markedPromise = new Promise((resolve) => {
    if (typeof marked !== 'undefined') {
        resolve(marked);
    } else {
        window.addEventListener('load', () => resolve(marked));
    }
});

async function initializeMarked() {
    const marked = await markedPromise;
    
    // Create a new renderer
    const renderer = new marked.Renderer();
    
    // Store the original link renderer
    const originalLink = renderer.link.bind(renderer);
    
    // Override the link renderer
    renderer.link = (href, title, text) => {
        const isExternal = href.startsWith('http') || href.startsWith('https');
        const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
        const link = originalLink(href, title, text);
        return link.replace(/^<a /, `<a${attrs} `);
    };

    // Set options with the custom renderer
    marked.setOptions({
        highlight: function(code, lang) {
            if (Prism.languages[lang]) {
                return Prism.highlight(code, Prism.languages[lang], lang);
            }
            return code;
        },
        breaks: true,
        gfm: true,
        renderer: renderer
    });

    return marked;
}

function createFileIndexItem(doc, container, level = 0) {
    if (doc.type === 'folder') {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder open';
        folderDiv.dataset.path = doc.title;
        folderDiv.style.paddingLeft = `${level * 0.8}rem`;

        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        folderHeader.innerHTML = `
            <i class="fas fa-folder-open folder-icon"></i>
            <span>${doc.title}</span>
        `;
        folderDiv.appendChild(folderHeader);

        const folderContent = document.createElement('div');
        folderContent.className = 'folder-content';
        doc.items.forEach(item => createFileIndexItem(item, folderContent, level + 1));
        folderDiv.appendChild(folderContent);

        folderHeader.addEventListener('click', () => {
            folderDiv.classList.toggle('open');
            folderHeader.querySelector('.folder-icon').classList.toggle('fa-folder-closed');
            folderHeader.querySelector('.folder-icon').classList.toggle('fa-folder-open');
        });

        container.appendChild(folderDiv);
    } else {
        const link = document.createElement('a');
        link.href = `?${doc.slug}`;
        // Use title from json or fallback to filename
        const displayTitle = doc.title || doc.path.split('/').pop().replace('.md', '');
        link.textContent = displayTitle;
        link.dataset.path = doc.path;
        link.style.paddingLeft = `${level * 0.8 + 1.2}rem`;
        
        link.onclick = (e) => {
            e.preventDefault();
            loadDocument(doc.path);
            history.pushState(null, '', link.href);
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
            console.log('Loading document for slug:', slug);
            
            const matchingDoc = findDocumentBySlug(data.documents, slug);
            
            if (matchingDoc) {
                console.log('Found matching document:', matchingDoc);
                await loadDocument(matchingDoc.path);
            } else {
                console.warn('No matching document found for slug:', slug);
            }
        } else {
            const defaultDoc = findDocumentBySlug(data.documents, 'welcome');
            if (defaultDoc) {
                await loadDocument(defaultDoc.path);
            }
        }
    } catch (error) {
        console.error('Failed to load index:', error);
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
        
        // Get the title from index.json
        const indexResponse = await fetch('index.json');
        const indexData = await indexResponse.json();
        const docEntry = findDocumentByPath(indexData.documents, path);
        
        // Use title priority: frontmatter > json > filename
        const titleContent = metadata.title || (docEntry && docEntry.title) || path.split('/').pop().replace('.md', '');
        
        // Process Obsidian internal links before adding the title
        let processedContent = content.replace(/\[\[(.*?)\]\]/g, (match, linkText) => {
            // Skip image/media processing
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

        // Process images/media after internal links
        const finalContent = processedContent.replace(/!\[\[(.*?)\]\]/g, (match, filename) => {
            const mediaPath = `${basePath}/images/${filename}`;
            
            if (filename.toLowerCase().endsWith('.mp4')) {
                return `\n<video controls width="100%">
                    <source src="${mediaPath}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>\n\n`;
            }
            
            return `\n![${filename}](${mediaPath})\n\n`;
        });

        const description = metadata.description || `Documentation for ${titleContent}`;
        const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        
        document.title = `Litruv / ${titleContent}`;
        document.querySelector('meta[name="description"]').setAttribute('content', description);
        document.querySelector('meta[property="og:title"]').setAttribute('content', titleContent);
        document.querySelector('meta[property="og:description"]').setAttribute('content', description);
        document.querySelector('meta[property="og:url"]').setAttribute('content', url);
        document.querySelector('meta[name="twitter:title"]').setAttribute('content', titleContent);
        document.querySelector('meta[name="twitter:description"]').setAttribute('content', description);

        if (metadata.image) {
            const imageUrl = `${window.location.origin}${window.location.pathname}${basePath}/images/${metadata.image}`;
            document.querySelector('meta[property="og:image"]')?.remove();
            document.querySelector('meta[name="twitter:image"]')?.remove();
            
            const ogImage = document.createElement('meta');
            ogImage.setAttribute('property', 'og:image');
            ogImage.setAttribute('content', imageUrl);
            document.head.appendChild(ogImage);
            
            const twitterImage = document.createElement('meta');
            twitterImage.setAttribute('name', 'twitter:image');
            twitterImage.setAttribute('content', imageUrl);
            document.head.appendChild(twitterImage);
        }

        document.title = `Litruv / ${titleContent}`;
        document.querySelector('.title-text .page-title').textContent = titleContent;

        documentContent.className = 'markdown-content';
        documentContent.innerHTML = marked.parse(finalContent);

        documentOutline.innerHTML = '';
        const headings = documentContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headings.forEach(heading => {
            if (!heading.id) {
                heading.id = heading.textContent.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');
            }
            
            const link = document.createElement('a');
            link.href = `${window.location.pathname}${window.location.search}#${heading.id}`;
            link.textContent = heading.textContent;
            link.style.paddingLeft = (heading.tagName[1] - 1) * 15 + 'px';
            
            link.onclick = (e) => {
                e.preventDefault();
                history.pushState(null, '', link.href);
                
                document.querySelectorAll('.highlight').forEach(el => {
                    el.classList.remove('highlight');
                });
                
                heading.classList.add('highlight');
                
                heading.scrollIntoView({ behavior: 'smooth' });
            };
            
            documentOutline.appendChild(link);
        });

        if (window.location.hash) {
            const id = window.location.hash.substring(1);
            const heading = document.getElementById(id);
            if (heading) {
                heading.classList.add('highlight');
                heading.scrollIntoView({ behavior: 'smooth' });
            }
        }

        Prism.highlightAll();
    } catch (error) {
        console.error('Error loading document:', error);
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
    console.log('Window loaded, initializing...');
    setupMobileMenu();
    loadIndex().catch(error => {
        console.error('Failed to initialize:', error);
        document.getElementById('document-content').innerHTML = 
            '<div class="error">Failed to load documentation. Please try refreshing the page.</div>';
    });
});
