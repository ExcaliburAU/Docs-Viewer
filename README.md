# Documentation Viewer

A robust, modern documentation viewer built for rendering Markdown files with advanced syntax highlighting capabilities. This zero-dependency static application enables seamless documentation hosting without backend requirements.

## Features

- 🚀 **High-Performance Rendering** - Lightning-fast Markdown processing with optimized syntax highlighting
- 📑 **Dynamic Navigation** - Auto-generated document outline with interactive table of contents
- 📱 **Responsive Design** - Optimized viewing experience across all device sizes
- 🔒 **Zero Backend** - Fully static implementation for maximum security and deployability
- 🎨 **Modern UI/UX** - Clean, intuitive interface with customizable theming

## Quick Start

### Development Setup

```sh
git clone https://github.com/litruv/Docs-Viewer
cd Docs-Viewer

git fetch upstream
git merge upstream/HEAD --no-ff
```

### Deployment

Deploy anywhere that serves static files. For local development:

```sh
npx live-server
```

## Project Structure

```
.
├── docs/           # Documentation source files
│   ├── images/     # Document assets
│   └── *.md        # Markdown documents
├── index.html      # Application entry point
├── config.json     # Document configuration
└── styles.css      # Theme customization
```

## Configuration

Configure your documentation site with a top-level index file named `index.json`. At minimum, include a `title`, a `defaultPage`, and a list of `documents`:

```json
{
    "title": "My Documentation Site",
    "defaultPage": "welcome",
    "documents": [
        {
            "title": "Welcome",
            "path": "docs/welcome.md",
            "slug": "welcome"
        }
    ]
}
```

> If you want to quickly get started, copy `example.index.json` to `index.json` in the project root of your own repository:

```sh
cp example.index.json index.json
```

Then adjust the `title`, `defaultPage`, and `documents` array to match your needs.

After placing your `index.json` in the project root, the application will:

1. Apply your site `title` to the browser tab and page header.
2. Load the `defaultPage` when no slug is specified in the URL.
3. Generate a navigation tree from the array of `documents`.

### Root Configuration Options

| Option        | Type   | Description                                              |
|---------------|--------|----------------------------------------------------------|
| `title`       | string | Title of your documentation site                         |
| `defaultPage` | string | Slug of the page to show when no page is specified       |
| `documents`   | array  | Array of document or folder entries (see below)          |

### Folder Organization

Folders can contain nested documents or subfolders. Mark a folder by setting `"type": "folder"`. Example:

```json
{
    "title": "My Documentation Site",
    "defaultPage": "welcome",
    "documents": [
        {
            "title": "Core Concepts",
            "type": "folder",
            "defaultOpen": true,
            "icon": "fa-solid fa-book",
            "path": "docs/core-concepts/index.md",
            "slug": "core-concepts",
            "items": [
                {
                    "title": "Getting Started",
                    "path": "docs/guides/getting-started.md",
                    "slug": "getting-started"
                }
            ]
        }
    ]
}
```

#### Folder Configuration Options

| Option          | Type     | Description                                        |
|-----------------|----------|----------------------------------------------------|
| `type`          | string   | Set to `"folder"` for a directory node            |
| `title`         | string   | Display name of the folder                        |
| `path`          | string?  | Optional content file path                        |
| `slug`          | string   | URL-friendly identifier; required if `path` exists|
| `items`         | array    | Nested documents or folders                       |
| `defaultOpen`   | boolean? | Automatically expand this folder in the sidebar   |
| `icon`          | string?  | Custom Font Awesome classes                       |

## Technology Stack

Built with modern web technologies and carefully selected dependencies:

- [marked](https://github.com/markedjs/marked) - Markdown processing
- [highlight.js](https://highlightjs.org/) - Syntax highlighting
- [Font Awesome](https://fontawesome.com/) - UI iconography

## License

Released under the MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.