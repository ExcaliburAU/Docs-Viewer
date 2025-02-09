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

### Document Index

Configure your documentation structure in `index.json`:

```json
{
    "title": "Your Documentation Title",
    "defaultPage": "welcome",
    "documents": [
        {
            "title": "Getting Started",
            "path": "docs/getting-started.md"
        }
    ]
}
```

#### Root Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `title` | string | The title of your documentation site |
| `defaultPage` | string | The slug of the page to show when no page is specified |
| `documents` | array | Array of document and folder objects |

### Folder Organization

Create hierarchical documentation structures with nested folders:

```json
{
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
                    "title": "Architecture",
                    "path": "docs/core-concepts/architecture.md"
                }
            ]
        }
    ]
}
```

#### Folder Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `type` | string | Set to `"folder"` for directory nodes |
| `title` | string | Display name |
| `path` | string? | Optional content file path |
| `slug` | string | URL-friendly identifier (required with `path`) |
| `items` | array | Nested documents or folders |
| `defaultOpen` | boolean? | Auto-expand folder |
| `icon` | string? | Custom Font Awesome class |

## Technology Stack

Built with modern web technologies and carefully selected dependencies:

- [marked](https://github.com/markedjs/marked) - Markdown processing
- [highlight.js](https://highlightjs.org/) - Syntax highlighting
- [Font Awesome](https://fontawesome.com/) - UI iconography

## License

Released under the MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.