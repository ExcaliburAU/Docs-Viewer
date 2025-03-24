const obsidian = require('obsidian');

class TitleAppenderPlugin extends obsidian.Plugin {
    async onload() {
        console.log('Loading TitleAppender plugin');
        
        // Initial update attempt
        this.updateAllTitles();
        
        // Wait for layout to be ready before registering events
        this.app.workspace.onLayoutReady(() => {
            this.registerEvents();
            
            // Force another update after layout is ready
            setTimeout(() => {
                this.updateAllTitles();
            }, 500);
        });

        // Schedule periodic updates to catch any missed files
        this.registerInterval(
            window.setInterval(() => this.updateAllTitles(), 5000)
        );
    }
    
    registerEvents() {
        // Update styles when files change
        this.registerEvent(
            this.app.metadataCache.on('changed', () => {
                this.updateAllTitles();
            })
        );
        
        // Update on file explorer changes
        this.registerEvent(
            this.app.workspace.on('file-menu', () => {
                this.updateAllTitles();
            })
        );
        
        // Update when layout changes
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.updateAllTitles();
            })
        );
    }
    
    updateAllTitles() {
        try {
            // Get all markdown files
            const files = this.app.vault.getMarkdownFiles();
            
            // First, clean up any existing elements
            this.cleanupExistingElements();
            
            // Apply classes and attributes for each file with frontmatter
            files.forEach(file => {
                try {
                    const metadata = this.app.metadataCache.getFileCache(file);
                    const frontmatter = metadata?.frontmatter;
                    const title = frontmatter?.title;
                    const sortValue = frontmatter?.sort;
                    
                    if (title || sortValue) {
                        const escapedPath = CSS.escape(file.path);
                        const fileElements = document.querySelectorAll(`.nav-file-title[data-path="${escapedPath}"] .nav-file-title-content`);
                        
                        fileElements.forEach(fileElement => {
                            if (fileElement) {
                                // Add title if available
                                if (title) {
                                    fileElement.classList.add('has-title');
                                    fileElement.setAttribute('data-title', ` (${title})`);
                                }
                                
                                // Add sort value if available
                                if (sortValue !== undefined) {
                                    fileElement.classList.add('has-sort-value');
                                    
                                    // If both title and sort exist, create a span for the sort value
                                    if (title) {
                                        // Create a span for the sort value to apply different color
                                        const sortSpan = document.createElement('span');
                                        sortSpan.className = 'sort-suffix';
                                        sortSpan.textContent = `[${sortValue}]`;
                                        fileElement.appendChild(sortSpan);
                                    } else {
                                        // If only sort exists, use the attribute
                                        fileElement.setAttribute('data-sort-value', `[${sortValue}]`);
                                    }
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error processing file:', file?.path, e);
                }
            });
        } catch (error) {
            console.error('Error updating titles:', error);
        }
    }
    
    cleanupExistingElements() {
        // Remove all classes and attributes
        document.querySelectorAll('.has-sort-value, .has-title').forEach(el => {
            el.classList.remove('has-sort-value', 'has-title');
            el.removeAttribute('data-sort-value');
            el.removeAttribute('data-title');
            
            // Remove any added elements
            const sortSuffix = el.querySelector('.sort-suffix');
            if (sortSuffix) sortSuffix.remove();
        });
    }
    
    onunload() {
        console.log('Unloading TitleAppender plugin');
        this.cleanupExistingElements();
    }
}

module.exports = TitleAppenderPlugin;
