const obsidian = require('obsidian');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

/**
 * Modal for Git commit messages
 */
class GitCommitModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Git Commit & Push' });
        
        const commitMsgContainer = contentEl.createDiv();
        commitMsgContainer.createEl('label', { text: 'Commit Message:' });
        
        const inputEl = commitMsgContainer.createEl('textarea');
        inputEl.style.width = '100%';
        inputEl.style.height = '100px';
        inputEl.style.marginBottom = '10px';
        
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        
        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => this.close());
        
        const commitButton = buttonContainer.createEl('button', { text: 'Commit & Push' });
        commitButton.style.marginLeft = '10px';
        commitButton.addEventListener('click', async () => {
            const message = inputEl.value.trim();
            if (message) {
                await this.plugin.commitAndPush(message);
                this.close();
            } else {
                new obsidian.Notice('Please enter a commit message');
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

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
        
        // Store Git status and ribbon icon reference
        this.hasUncommittedChanges = false;
        this.gitRibbonIcon = null;
        
        this.updateAllTitles();
        
        this.app.workspace.onLayoutReady(() => {
            this.registerEvents();
            
            setTimeout(() => {
                this.updateAllTitles();
                this.updateGitStatus();
            }, 500);
        });

        this.registerInterval(
            window.setInterval(() => this.updateAllTitles(), 5000)
        );
        
        // Add Git commit button to the left ribbon
        this.gitRibbonIcon = this.addRibbonIcon('git-pull-request', 'Git Commit & Push', async () => {
            try {
                const hasChanges = await this.hasGitChanges();
                
                if (hasChanges) {
                    new GitCommitModal(this.app, this).open();
                } else {
                    new obsidian.Notice('No changes to commit');
                }
            } catch (error) {
                console.error('Git error:', error);
                new obsidian.Notice(`Git error: ${error.message}`);
            }
        });
        
        // Add periodic Git status check
        this.registerInterval(
            window.setInterval(() => this.updateGitStatus(), 30000) // Check every 30 seconds
        );
        
        // Initial Git status check
        this.updateGitStatus();
    }
    
    /**
     * @description Updates the Git status indicator based on uncommitted changes
     * @returns {Promise<void>}
     */
    async updateGitStatus() {
        try {
            const hasChanges = await this.hasGitChanges();
            
            if (hasChanges && !this.hasUncommittedChanges) {
                // Add notification indicator
                this.gitRibbonIcon.addClass('git-notification-indicator');
                this.hasUncommittedChanges = true;
            } else if (!hasChanges && this.hasUncommittedChanges) {
                // Remove notification indicator
                this.gitRibbonIcon.removeClass('git-notification-indicator');
                this.hasUncommittedChanges = false;
            }
        } catch (error) {
            console.error('Error updating Git status:', error);
        }
    }
    
    /**
     * @description Check if there are uncommitted changes in the repository
     * @returns {Promise<boolean>} True if there are changes to commit
     */
    async hasGitChanges() {
        try {
            const vaultPath = this.app.vault.adapter.basePath;
            const { stdout } = await execPromise('git status --porcelain', { cwd: vaultPath });
            return stdout.trim().length > 0;
        } catch (error) {
            console.error('Error checking git status:', error);
            throw error;
        }
    }
    
    /**
     * @description Commit and push changes to the Git repository
     * @param {string} message - The commit message
     * @returns {Promise<void>}
     */
    async commitAndPush(message) {
        try {
            const vaultPath = this.app.vault.adapter.basePath;
            
            // Fetch from remote
            new obsidian.Notice('Fetching latest changes...');
            await execPromise('git fetch', { cwd: vaultPath });
            
            // Pull from remote
            new obsidian.Notice('Pulling latest changes...');
            await execPromise('git pull', { cwd: vaultPath });
            
            // Add all changes
            await execPromise('git add .', { cwd: vaultPath });
            
            // Commit with the provided message
            await execPromise(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: vaultPath });
            
            // Push to remote
            new obsidian.Notice('Committing changes...');
            const { stdout } = await execPromise('git push', { cwd: vaultPath });
            
            // Update Git status after commit
            this.updateGitStatus();
            
            new obsidian.Notice('Successfully committed and pushed changes');
            console.log('Git push result:', stdout);
        } catch (error) {
            console.error('Error in git operations:', error);
            new obsidian.Notice(`Git error: ${error.message}`);
            throw error;
        }
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
        
        // Clean up Git notification indicator if it exists
        if (this.gitRibbonIcon) {
            this.gitRibbonIcon.removeClass('git-notification-indicator');
        }
    }
}

module.exports = DocsViewerPlugin;
