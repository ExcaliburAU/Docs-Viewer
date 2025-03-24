const obsidian = require('obsidian');

class TitleAppenderPlugin extends obsidian.Plugin {
    async onload() {
        console.log('Loading TitleAppender plugin');
        
        // Create stylesheet element only once during initialization
        try {
            this.styleEl = document.head.createEl('style');
            this.styleEl.id = 'title-appender-styles';
        } catch (error) {
            console.error('Error creating style element:', error);
            return;
        }
        
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
            let cssRules = [];
            
            // Create CSS rules for each file with a frontmatter title
            files.forEach(file => {
                try {
                    const metadata = this.app.metadataCache.getFileCache(file);
                    const title = metadata?.frontmatter?.title;
                    
                    if (title) {
                        const escapedPath = CSS.escape(file.path);
                        const escapedTitle = title.replace(/"/g, '\\"');
                        
                        cssRules.push(`
                            .nav-file-title[data-path="${escapedPath}"] .nav-file-title-content::after {
                                content: " (${escapedTitle})";
                                color: var(--color-orange);
                                font-size: 0.85em;
                                opacity: 0.8;
                            }
                        `);
                    }
                } catch (e) {
                    console.error('Error processing file:', file?.path, e);
                }
            });
            
            // Update stylesheet content
            if (this.styleEl) {
                this.styleEl.textContent = cssRules.join("\n");
            }
        } catch (error) {
            console.error('Error updating titles:', error);
        }
    }
    
    onunload() {
        console.log('Unloading TitleAppender plugin');
        if (this.styleEl) {
            this.styleEl.remove();
        }
    }
}

module.exports = TitleAppenderPlugin;
