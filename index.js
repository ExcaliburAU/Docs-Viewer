// Initialize marked when it's available
let markedPromise = new Promise((resolve) => {
    if (typeof marked !== 'undefined') {
        resolve(marked);
    } else {
        window.addEventListener('load', () => resolve(marked));
    }
});

// Configure marked options
async function initializeMarked() {
    const marked = await markedPromise;
    marked.setOptions({
        highlight: function(code, lang) {
            if (Prism.languages[lang]) {
                return Prism.highlight(code, Prism.languages[lang], lang);
            }
            return code;
        },
        breaks: true,
        gfm: true
    });
    return marked;
}

function createFileIndexItem(doc, container, level = 0) {
    if (doc.type === 'folder') {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder open';
        folderDiv.dataset.path = doc.title;  // Add data attribute for folder identification
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
        link.href = `?${doc.slug}`; // Use slug instead of generating filename
        link.textContent = doc.title;
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

// Add this new function to find parent folders of a path
function findParentFolders(documents, path, parentFolders = []) {
    for (const doc of documents) {
        if (doc.type === 'folder') {
            // Check if path is in this folder
            const found = doc.items.find(item => {
                if (item.path === path) return true;
                if (item.type === 'folder') {
                    return findParentFolders([item], path).length > 0;
                }
                return false;
            });
            
            if (found) {
                parentFolders.push(doc);
                // Continue searching in case of nested folders
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

// Helper function to find document by slug in nested structure
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
        
        // Clear existing content
        fileIndex.innerHTML = '';
        
        // Build file index with folder support
        data.documents.forEach(doc => createFileIndexItem(doc, fileIndex));

        // Handle initial URL load or load index.md by default
        const queryString = window.location.search;
        if (queryString) {
            const slug = queryString.substring(1); // Remove the leading '?'
            console.log('Loading document for slug:', slug); // Debug log
            
            const matchingDoc = findDocumentBySlug(data.documents, slug);
            
            if (matchingDoc) {
                console.log('Found matching document:', matchingDoc); // Debug log
                await loadDocument(matchingDoc.path);
            } else {
                console.warn('No matching document found for slug:', slug); // Debug log
            }
        } else {
            // Load index.md by default when no document is specified
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

// Add popstate handler for browser back/forward buttons
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

    // Check if the file starts with a metadata section (accounting for whitespace)
    if (lines[0].trim() === '---') {
        let endMetadata = -1;
        
        // Find the closing '---'
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                endMetadata = i;
                break;
            }
            // Parse key-value pairs (ignore empty lines)
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

    // Trim any leading/trailing whitespace from the content
    return {
        metadata,
        content: lines.slice(contentStart).join('\n').trim()
    };
}

async function loadDocument(path) {
    try {
        // Update active state in sidebar and expand folders
        document.querySelectorAll('#file-index a').forEach(link => {
            link.classList.toggle('active', link.dataset.path === path);
            
            // If this is the active link, expand its parent folders
            if (link.dataset.path === path) {
                const response = fetch('index.json')
                    .then(res => res.json())
                    .then(data => {
                        const parentFolders = findParentFolders(data.documents, path);
                        parentFolders.forEach(folder => {
                            // Find and expand the corresponding folder div
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
        
        const basePath = path.substring(0, path.lastIndexOf('/'));
        const documentContent = document.getElementById('document-content');
        const documentOutline = document.getElementById('document-outline');
        
        // Create title element
        const titleContent = metadata.title || path.split('/').pop().replace('.md', '');
        const processedContent = `# ${titleContent}\n\n${content}`;
        
        // Convert Obsidian media links to HTML with proper spacing
        const finalContent = processedContent.replace(/!\[\[(.*?)\]\]/g, (match, filename) => {
            const mediaPath = `${basePath}/images/${filename}`;
            
            // Check if it's a video file
            if (filename.toLowerCase().endsWith('.mp4')) {
                return `\n<video controls width="100%">
                    <source src="${mediaPath}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>\n\n`;
            }
            
            // Default to image handling with added newlines
            return `\n![${filename}](${mediaPath})\n\n`;
        });

        // Update meta tags
        const description = metadata.description || `Documentation for ${titleContent}`;
        const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        
        document.title = `Litruv / ${titleContent}`;
        document.querySelector('meta[name="description"]').setAttribute('content', description);
        document.querySelector('meta[property="og:title"]').setAttribute('content', titleContent);
        document.querySelector('meta[property="og:description"]').setAttribute('content', description);
        document.querySelector('meta[property="og:url"]').setAttribute('content', url);
        document.querySelector('meta[name="twitter:title"]').setAttribute('content', titleContent);
        document.querySelector('meta[name="twitter:description"]').setAttribute('content', description);

        // If there's a cover image in metadata
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

        // Update page and title bar while preserving menu button and brand
        document.title = `Litruv / ${titleContent}`;
        document.querySelector('.title-text .page-title').textContent = titleContent;

        // Parse markdown content
        documentContent.className = 'markdown-content';
        documentContent.innerHTML = marked.parse(finalContent);

        // Generate outline
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
                // Update URL without triggering navigation
                history.pushState(null, '', link.href);
                
                // Remove existing highlights
                document.querySelectorAll('.highlight').forEach(el => {
                    el.classList.remove('highlight');
                });
                
                // Add highlight class to trigger animation
                heading.classList.add('highlight');
                
                // Smooth scroll
                heading.scrollIntoView({ behavior: 'smooth' });
            };
            
            documentOutline.appendChild(link);
        });

        // Check for hash in URL and highlight on load
        if (window.location.hash) {
            const id = window.location.hash.substring(1);
            const heading = document.getElementById(id);
            if (heading) {
                heading.classList.add('highlight');
                heading.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // Highlight code blocks
        Prism.highlightAll();
    } catch (error) {
        console.error('Error loading document:', error);
        document.getElementById('document-content').innerHTML = 
            '<div class="error">Error loading document. Please try again.</div>';
    }
}

// Handle image paths
function fixImagePaths(basePath, content) {
    return content.replace(/!\[\[(.*?)\]\]/g, (match, filename) => {
        const imagePath = basePath + '/images/' + filename;
        return `![${filename}](${imagePath})`;
    });
}

// Add menu toggle functionality
function setupMobileMenu() {
    const menuButton = document.querySelector('.menu-button');
    const leftSidebar = document.querySelector('.left-sidebar');
    const content = document.querySelector('.content');

    menuButton.addEventListener('click', () => {
        leftSidebar.classList.toggle('show');
    });

    // Close menu when clicking outside
    content.addEventListener('click', () => {
        if (leftSidebar.classList.contains('show')) {
            leftSidebar.classList.remove('show');
        }
    });
}

// Add new initialization with proper order
window.addEventListener('load', () => {
    console.log('Window loaded, initializing...'); // Debug log
    setupMobileMenu();
    loadIndex().catch(error => {
        console.error('Failed to initialize:', error);
        document.getElementById('document-content').innerHTML = 
            '<div class="error">Failed to load documentation. Please try refreshing the page.</div>';
    });
});
