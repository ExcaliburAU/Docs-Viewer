const obsidian = require('obsidian');

class TitleAppenderPlugin extends obsidian.Plugin {
    async onload() {
        console.log('Loading TitleAppender plugin');
        
        // Wait for layout to be ready
        this.app.workspace.onLayoutReady(() => {
            this.registerEvents();
            this.updateAllTitles();
        });
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
            
            // First, reset all previously set classes and attributes
            document.querySelectorAll('.has-sort-value, .has-title').forEach(el => {
                el.classList.remove('has-sort-value', 'has-title');
                el.removeAttribute('data-sort-value');
                el.removeAttribute('data-title');
            });
            
            // Apply classes and attributes for each file with frontmatter
            files.forEach(file => {
                try {
                    const metadata = this.app.metadataCache.getFileCache(file);
                    const frontmatter = metadata?.frontmatter;
                    const title = frontmatter?.title;
                    const sortValue = frontmatter?.sort;
                    
                    if (title || sortValue) {
                        const escapedPath = CSS.escape(file.path);
                        const fileElement = document.querySelector(`.nav-file-title[data-path="${escapedPath}"] .nav-file-title-content`);
                        
                        if (fileElement) {
                            // Add sort value if available
                            if (sortValue !== undefined) {
                                fileElement.classList.add('has-sort-value');
                                fileElement.setAttribute('data-sort-value', `[${sortValue}] `);
                            }
                            
                            // Add title if available
                            if (title) {
                                fileElement.classList.add('has-title');
                                fileElement.setAttribute('data-title', ` (${title})`);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error processing file:', file?.path, e);
                }
            });
        } catch (error) {
            console.error('Error updating titles:', error);
        }
    }
    
    onunload() {
        console.log('Unloading TitleAppender plugin');
        
        // Clean up any added classes when unloading
        document.querySelectorAll('.has-sort-value, .has-title').forEach(el => {
            el.classList.remove('has-sort-value', 'has-title');
            el.removeAttribute('data-sort-value');
            el.removeAttribute('data-title');
        });
    }
}

module.exports = TitleAppenderPlugin;
