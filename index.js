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

async function loadIndex() {
    try {
        const response = await fetch('index.json');
        const data = await response.json();
        const fileIndex = document.getElementById('file-index');
        
        // Build file index
        data.documents.forEach(doc => {
            const link = document.createElement('a');
            const fileName = doc.path.replace(/^docs\//, '')
                               .replace(/\.md$/, '')
                               .replace(/\s+/g, '-')
                               .toLowerCase();
            
            link.href = `?${fileName}`;
            link.textContent = doc.title;
            link.onclick = (e) => {
                e.preventDefault();
                loadDocument(doc.path);
                history.pushState(null, '', link.href);
            };
            fileIndex.appendChild(link);
        });

        // Handle initial URL load
        const queryString = window.location.search;
        if (queryString) {
            const fileParam = queryString.substring(1); // Remove the leading '?'
            console.log('Loading document for:', fileParam); // Debug log
            
            const matchingDoc = data.documents.find(doc => {
                const docFileName = doc.path.replace(/^docs\//, '')
                                     .replace(/\.md$/, '')
                                     .replace(/\s+/g, '-')
                                     .toLowerCase();
                return docFileName === fileParam;
            });
            
            if (matchingDoc) {
                console.log('Found matching document:', matchingDoc); // Debug log
                await loadDocument(matchingDoc.path);
            } else {
                console.warn('No matching document found for:', fileParam); // Debug log
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
    const fileParam = urlParams.toString().replace(/^=/, '').replace(/^\?/, '');
    if (fileParam) {
        const response = await fetch('index.json');
        const data = await response.json();
        const matchingDoc = data.documents.find(doc => {
            const docFileName = doc.path.replace(/^docs\//, '')
                                 .replace(/\.md$/, '')
                                 .replace(/\s+/g, '-')
                                 .toLowerCase();
            return docFileName === fileParam;
        });
        
        if (matchingDoc) {
            await loadDocument(matchingDoc.path);
        }
    }
});

function extractMetadata(content) {
    const lines = content.split('\n');
    let metadata = {};
    let contentStart = 0;

    // Check if the file starts with a metadata section
    if (lines[0] === '---') {
        let endMetadata = -1;
        
        // Find the closing '---'
        for (let i = 1; i < lines.length; i++) {
            if (lines[i] === '---') {
                endMetadata = i;
                break;
            }
            // Parse key-value pairs
            const match = lines[i].match(/^([\w-]+):\s*(.*)$/);
            if (match) {
                metadata[match[1]] = match[2].trim();
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

async function loadDocument(path) {
    try {
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
