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

### Adding New Documents

1. Add your Markdown file to the  directory.
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

## Acknowledgements

- [marked](https://github.com/markedjs/marked) for Markdown parsing.
- [Prism](https://prismjs.com/) for syntax highlighting.

## License

This project is licensed under the MIT License.