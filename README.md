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

[Fork this Repo](https://github.com/example/Docs-Viewer/fork)

#### Updating

##### From GitHub

On your own repo,

1. Click Sync fork
2. Update branch

##### From CLI

```sh
git fetch upstream
git merge upstream/master
git push
```

### Deployment

Deploy anywhere that serves static files. For local development:

VSCode:
[LiveServer](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) and hit start server in the docs-viewer directory

Command Line:

```sh
npx live-server
```

#### Cloudflare Pages

1. Create a new repository on GitHub.
2. Push your code to the repository.
3. Go to [Cloudflare Pages](https://pages.cloudflare.com/) and connect your GitHub repository.
4. Configure the build settings:
   - **Production branch:** `main` (or your main branch name)
   - **Build command:** Leave empty
   - **Build output directory:** `/` (root)
5. Save and deploy.

##### Optional: Cloudflare Worker for OG/Twitter Tags

For improved SEO and social sharing, you can use a Cloudflare Worker to dynamically generate OG/Twitter tags.

1. Create a new Cloudflare Worker using the code in `cloudflare-worker.js`.
2. Set the `SITE_URL` environment variable to where your site will be located, e.g., `https://example.com/docs/`
3. Set the `DOCS_URL` environment variable to the URL where your documentation files are hosted (usually your Cloudflare Pages URL).
4. Configure a route in your Cloudflare account to route all requests to your Cloudflare Pages site through the worker.

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

> If you want to quickly get started, copy `example.index.json` to `index.json` in the project root:

```sh
cp example.index.json index.json
```

Then adjust the `title`, `defaultPage`, and `documents` array to match your needs.

### Root Configuration Options

| Option        | Type   | Description                                        |   |
| ------------- | ------ | -------------------------------------------------- | - |
| `defaultPage` | string | Slug of the page to show when no page is specified |   |
| `documents`   | array  | Array of document or folder entries (see below)    |   |

### Folder Organization

Folders can contain nested documents or subfolders. Mark a folder by setting `"type": "folder"`. Example:

```json
{
    "title": "Core Concepts",
    "type": "folder",
    "path": "docs/core-concepts/index.md",
    "slug": "core-concepts",
    "defaultOpen": true,
    "icon": "fa-solid fa-book",
    "color": "#01beef",
    "items": [
        {
            "title": "Getting Started",
            "path": "docs/guides/getting-started.md",
            "slug": "getting-started"
        }
    ]
}
```

#### Folder Configuration Options

| Option        | Type     | Description                                        |
| ------------- | -------- | -------------------------------------------------- |
| `title`       | string   | Display name of the folder                         |
| `type`        | string   | Set to `"folder"` for a directory node             |
| `path`        | string?  | Optional content file path                         |
| `slug`        | string   | URL-friendly identifier; required if `path` exists |
| `defaultOpen` | boolean? | Automatically expand this folder in the sidebar    |
| `icon`        | string?  | Custom Font Awesome classes                        |
| `items`       | array    | Nested documents or folders                        |

## Metadata Configuration

> To be used with the cloudflare-worker.js

You can include a "metadata" object in `index.json` to provide:

- Site-wide title and short description
- Thumbnail for social sharing
- Display name for your site

```json
"metadata": {
    "site_name": "MyDocs"
    "description": "Documentation for my project",
    "thumbnail": "img/og-image.png",
}
```

#### Metadata Configuration Options

| Option        | Type   | Description                                 |
| ------------- | ------ | ------------------------------------------- |
| `site_name`   | string | Display name for your site                  |
| `description` | string | Description of your documentation site      |
| `thumbnail`   | string | URL to a thumbnail image for social sharing |

## License

Released under the MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

