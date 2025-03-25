const obsidian = require('obsidian');

/**
 * @class DocsViewerPlugin
 * @description An Obsidian plugin that enhances document viewing by adding titles from frontmatter to file and folder elements
 * @extends {obsidian.Plugin}
 */
class DocsViewerPlugin extends obsidian.Plugin {
    /**
     * @description Plugin initialization method called when the plugin is loaded
     * @returns {Promise<void>}
     */
    async onload() {
        console.log('Loading DocsViewer plugin');
        
        this.updateAllTitles();
        
        this.app.workspace.onLayoutReady(() => {
            this.registerEvents();
            
            setTimeout(() => {
                this.updateAllTitles();
            }, 500);
        });

        this.registerInterval(
            window.setInterval(() => this.updateAllTitles(), 5000)
        );
    }
    
    /**
     * @description Registers event listeners for file and layout changes
     * @returns {void}
     */
    registerEvents() {
        this.registerEvent(
            this.app.metadataCache.on('changed', () => {
                this.updateAllTitles();
            })
        );
        
        this.registerEvent(
            this.app.workspace.on('file-menu', () => {
                this.updateAllTitles();
            })
        );
        
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.updateAllTitles();
            })
        );
    }
    
    /**
     * @description Updates display titles for files and folders based on frontmatter data
     * @details Processes all markdown files to extract frontmatter and update the UI with proper titles and sorting
     * @returns {void}
     */
    updateAllTitles() {
        try {
            const files = this.app.vault.getMarkdownFiles();
            this.cleanupExistingElements();

            this.ensureCustomStyles();

            document.querySelectorAll('.tree-item.nav-file, .nav-file, .tree-item.nav-folder, .nav-folder').forEach(item => {
                let path, isFolder;
                
                const folderTitleEl = item.querySelector('.tree-item-self[data-path]');
                if (folderTitleEl && item.classList.contains('nav-folder')) {
                    path = folderTitleEl.getAttribute('data-path');
                    isFolder = true;
                } else {
                    const fileEl = item.querySelector('.tree-item-self, .nav-file-title');
                    if (fileEl) {
                        path = fileEl.getAttribute('data-path');
                        isFolder = false;
                    } else {
                        return;
                    }
                }
                
                if (!path) return;
                
                let file;
                if (isFolder) {
                    const folderName = path.split('/').pop();
                    file = files.find(f => f.path === `${path}/${folderName}.md`);
                    
                    if (!file) return;
                } else {
                    file = files.find(f => f.path === path);
                }
                
                if (!file) return;
                
                const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                
                const parentContainer = item.parentElement;
                if (parentContainer) {
                    parentContainer.classList.add('docs-viewer-flex-container');
                    
                    let sortValue;
                    
                    if (!isFolder) {
                        const filePath = file.path;
                        const folderName = filePath.substring(0, filePath.lastIndexOf('/')).split('/').pop();
                        if (folderName && file.basename === folderName) {
                            sortValue = -9999999;
                        } else {
                            sortValue = frontmatter?.sort !== undefined ? parseInt(frontmatter.sort) : 9999;
                        }
                    } else {
                        sortValue = frontmatter?.sort !== undefined ? parseInt(frontmatter.sort) : 9999;
                    }
                    
                    item.style.order = sortValue;
                }
                
                if (!isFolder) {
                    const titleEl = item.querySelector('.tree-item-inner, .nav-file-title-content');
                    if (titleEl) {
                        const frontTitle = frontmatter?.title;
                        if (frontTitle && frontTitle !== file.basename) {
                            const frontSort = frontmatter?.sort;
                            let displayTitle = frontTitle;
                            if (frontSort !== undefined) {
                                titleEl.setAttribute('data-sort', frontSort);
                            }
                            
                            titleEl.classList.add('has-title');
                            titleEl.setAttribute('data-title', ` (${displayTitle})`);
                        }
                    }
                } 
                else {
                    const folderTitleEl = item.querySelector('.tree-item-inner') || 
                                         item.querySelector('.nav-folder-title-content');
                    
                    if (folderTitleEl && frontmatter && frontmatter.title) {
                        const frontTitle = frontmatter.title;
                        const frontSort = frontmatter.sort;
                        
                        folderTitleEl.classList.add('has-title');
                        folderTitleEl.setAttribute('data-title', ` (${frontTitle})`);
                        
                        if (frontSort !== undefined) {
                            folderTitleEl.setAttribute('data-sort', frontSort);
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error updating titles:', error);
        }
    }

    /**
     * @description Ensures the plugin's custom CSS styles are loaded in the document
     * @returns {void}
     */
    ensureCustomStyles() {
        const styleId = 'docs-viewer-style';
        // Check if our stylesheet is already in the document
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'obsidian://css-theme-plugins/docs-viewer/styles.css';
            document.head.appendChild(link);
        }
    }

    /**
     * @description Removes all custom classes and attributes added by this plugin
     * @details Called during cleanup and before applying new changes to prevent duplication
     * @returns {void}
     */
    cleanupExistingElements() {
        // Remove custom classes and attributes from elements
        document.querySelectorAll('.has-title, .folder-has-title').forEach(el => {
            el.classList.remove('has-title', 'folder-has-title');
            el.removeAttribute('data-title');
            el.removeAttribute('data-sort');
            el.removeAttribute('data-folder-title');
        });
        
        // Reset order styles on tree items and files
        document.querySelectorAll('.tree-item, .nav-file').forEach(el => {
            el.style.order = '';
        });
    }
    
    /**
     * @description Plugin lifecycle method called when the plugin is disabled or Obsidian is closed
     * @details Performs cleanup to remove all plugin-added elements and styles
     * @returns {void}
     */
    onunload() {
        console.log('Unloading DocsViewer plugin');
        // Remove all custom attributes and classes
        this.cleanupExistingElements();
        
        // Remove flex container class from parent elements
        document.querySelectorAll('.docs-viewer-flex-container').forEach(el => {
            el.classList.remove('docs-viewer-flex-container');
        });
        
        // Ensure order styles are cleared from navigation elements
        document.querySelectorAll('.nav-file, .nav-file-title').forEach(el => {
            el.style.order = '';
        });
    }
}

module.exports = DocsViewerPlugin;
