const fs = require('fs');
const path = require('path');

function extractHeaders(content) {
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    const headers = [];
    let match;
    
    while ((match = headerRegex.exec(content)) !== null) {
        // Don't include h1 headers as they're typically the title
        if (match[1].length > 1) {
            headers.push(match[2].trim());
        }
    }
    
    return headers;
}

function parseFrontMatter(content) {
    const lines = content.trim().split('\n');
    let metadata = {};
    let contentStart = 0;

    if (lines[0].trim() === '---') {
        let endMetadata = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
        if (endMetadata !== -1) {
            // Extract key-value pairs from frontmatter
            const frontmatterEntries = lines.slice(1, endMetadata)
                .map(line => line.match(/^([\w-]+):\s*(.*)$/))
                .filter(Boolean)
                .map(([, key, value]) => {
                    // Convert specific properties to their proper types
                    if (key === 'defaultOpen') {
                        return [key, value.trim().toLowerCase() === 'true'];
                    } 
                    else if (key === 'sort') {
                        return [key, parseInt(value.trim(), 10)];
                    }
                    else {
                        return [key, value.trim()];
                    }
                });
            
            metadata = Object.fromEntries(frontmatterEntries);
            contentStart = endMetadata + 1;
        }
    }

    const contentText = lines.slice(contentStart).join('\n').trim();
    const headers = extractHeaders(contentText);
    if (headers.length > 0) {
        metadata.headers = headers;
    }

    return {
        metadata,
        content: contentText
    };
}

function sanitizeTitle(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function parseFolderDoc(folder, folderName) {
  const folderDocPath = path.join(folder, folderName + '.md');
  let folderMetadata = {};
  let folderPathRel = null;

  if (fs.existsSync(folderDocPath)) {
    const folderDocContent = fs.readFileSync(folderDocPath, 'utf-8');
    const { metadata } = parseFrontMatter(folderDocContent);
    if (!metadata.slug) {
      metadata.slug = metadata.title
        ? sanitizeTitle(metadata.title)
        : sanitizeTitle(folderName);
    }
    folderPathRel = path.relative(__dirname, folderDocPath).replace(/\\/g, '/');
    folderMetadata = { ...metadata };
  }
  return { folderPathRel, folderMetadata };
}

function parseMdFile(fullPath) {
  const content = fs.readFileSync(fullPath, 'utf-8');
  const { metadata } = parseFrontMatter(content);
  if (!metadata.slug) {
    metadata.slug = metadata.title
      ? sanitizeTitle(metadata.title)
      : sanitizeTitle(path.parse(fullPath).name);
  }
  let result = {
    ...metadata,
    title: metadata.title || path.parse(fullPath).name,
    slug: metadata.slug
  };

  const parsedPath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
  if (parsedPath) {
    result.path = parsedPath;
  }

  return result;
}

function processFolder(folder, parentSlug = '') {
  const folderName = path.parse(folder).name;
  const { folderPathRel, folderMetadata } = parseFolderDoc(folder, folderName);

  let folderSlug = folderMetadata.slug || sanitizeTitle(folderName);
  if (folderName.toLowerCase() === 'docs' && !parentSlug) {
    folderSlug = '';
  } else if (parentSlug) {
    folderSlug = parentSlug + '/' + folderSlug;
  }

  const items = [];
  fs.readdirSync(folder).forEach(item => {
    const fullPath = path.join(folder, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'images') {
      items.push(processFolder(fullPath, folderSlug));
    } else if (path.extname(item) === '.md' && 
              fullPath !== folderPathRel?.replace(/\//g, path.sep) &&
              path.parse(item).name.toLowerCase() !== folderName.toLowerCase()) {
      const file = parseMdFile(fullPath);
      file.slug = folderSlug ? `${folderSlug}/${file.slug}` : file.slug;
      items.push(file);
    }
  });

  // Sort items
  items.sort((a, b) => {
    // Get sort values, default to Infinity for items without sort value
    const aHasSort = typeof a.sort === 'number';
    const bHasSort = typeof b.sort === 'number';

    // If one has sort and the other doesn't, sorted items come first
    if (aHasSort !== bHasSort) {
      return aHasSort ? -1 : 1;
    }

    // If both have sort values
    if (aHasSort && bHasSort) {
      if (a.sort !== b.sort) {
        return a.sort - b.sort;
      }
    }

    // Finally sort alphabetically by title
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
  });

  let result = {
    ...folderMetadata,
    title: folderMetadata.title || folderName,
    type: 'folder',
    slug: folderSlug,
    items
  };

  if (folderPathRel) {
    result.path = folderPathRel;
  }

  return result;
}

function readAllMarkdownFiles(dir) {
  const root = processFolder(dir);
  return root.items;
}

function loadIndexTemplate() {
  const indexPath = path.join(__dirname, 'index.json');
  try {
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    delete indexData.documents;
    return indexData;
  } catch (error) {
    console.error('Error reading index.json:', error);
    return {
      defaultPage: "welcome",
      metadata: {
        title: "Documentation",
        description: "Documentation",
        thumbnail: "img/og-image.png",
        site_name: "Documentation"
      },
      author: {}
    };
  }
}

function writeIndexFile(indexData) {
  const indexPath = path.join(__dirname, 'index.json');
  try {
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
    console.log('Successfully wrote index.json');
  } catch (error) {
    console.error('Error writing index.json:', error);
  }
}

function combineIndexes(dir) {
  const indexData = loadIndexTemplate();
  const documents = readAllMarkdownFiles(dir);
  
  indexData.documents = documents;
  writeIndexFile(indexData);
}

combineIndexes(path.join(__dirname, 'docs'));

module.exports = readAllMarkdownFiles;

