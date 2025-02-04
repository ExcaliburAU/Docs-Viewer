# Documentation Viewer

A lightweight, static documentation viewer that renders Markdown files with syntax highlighting. Built as a single-page application with no backend requirements.

## Features

- 📝 Renders Markdown documents with syntax highlighting
- 📑 Document outline/table of contents
- 📱 Responsive design with mobile support
- 🚀 Zero backend requirements - deploy anywhere
- ⚡ Fast client-side rendering

## Getting Started

### Prerequisites

- Node.js and npm (only needed for development)

### Installation

1. Clone the repository:

    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2. Install dependencies (only needed for development):

    ```sh
    npm install
    ```

### Deployment

This is a static website that can be hosted on any web server or static hosting service. Simply upload all files to your hosting provider.

For local testing, you can use any static file server. For example:
```sh
npx live-server
```

### Usage

- The file index is displayed on the left sidebar.
- Click on a file to load its content.
- The document outline is displayed on the right sidebar.
- Use the menu button to toggle the sidebar on mobile devices.

### Directory Structure

```
docs/               # Your markdown documents go here
├── images/         # Images referenced in documents
├── doc1.md
└── doc2.md
index.html         # Main entry point
config.json        # Document index configuration
styles.css         # Custom styling
```

### Adding New Documents

1. Add your Markdown file to the `docs` directory.
2. Update  to include the new document:

```json
{
    "documents": [
        {
            "title": "Blueprint Depth Trace",
            "path": "docs/Blueprint Penetration Trace.md"
        },
        {
            "title": "New Document Title",
            "path": "docs/NewDocument.md"
        }
    ]
}
```

## Configuring Folders
You can control whether a folder is expanded by default using `defaultOpen`. You can also specify a Font Awesome `icon`. 
Both properties (`defaultOpen` and `icon`) are optional — if you omit them, the folder will use default behavior.

Example in index.json:
```json
{
    "folders": [
        {
            "title": "Folder 1",
            "defaultOpen": true,
            "icon": "fa-folder",
            "documents": [
                {
                    "title": "Document 1",
                    "path": "docs/Document1.md"
                }
            ]
        }
    ]
}
```

## Acknowledgements

- [marked](https://github.com/markedjs/marked) for Markdown parsing.
- [highlight.js](https://highlightjs.org/) for syntax highlighting.
- [Font Awesome](https://fontawesome.com/) for icons

## License

This project is licensed under the MIT License.