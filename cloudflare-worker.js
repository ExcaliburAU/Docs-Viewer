async function generateOGTags(url, SITE_URL, DOCS_URL) {
    const params = new URLSearchParams(url.search);
    let slug = '';
    if (params.has('')) {
        slug = params.get('');
    } else {
        for (const [key] of params) {
            slug = key;
            break;
        }
    }

    const indexResponse = await fetch(`${DOCS_URL}/index.json`);
    const indexData = await indexResponse.json();
    const defaultPage = indexData.defaultPage || 'welcome';
    slug = slug || defaultPage;

    function findDocumentBySlug(documents, targetSlug) {
        for (const doc of documents) {
            if (doc.slug === targetSlug) return doc;
            if (doc.type === 'folder' && doc.items) {
                const found = findDocumentBySlug(doc.items, targetSlug);
                if (found) return found;
            }
        }
        return null;
    }

    const currentDoc = findDocumentBySlug(indexData.documents, slug);
    let description = indexData.metadata?.description || 'Documentation reader';
    let thumbnail = indexData.metadata?.thumbnail || 'img/og-image.png';
    if (currentDoc) {
        try {
            const docResponse = await fetch(`${DOCS_URL}/${currentDoc.path}`);
            const content = await docResponse.text();

            const metadataMatch = content.match(/---\n([\s\S]*?)\n---/);
            if (metadataMatch) {
                const metadataStr = metadataMatch[1];
                console.log(metadataMatch);
                const thumbnailMatch = metadataStr.match(/thumbnail:\s*(.*)/);
                if (thumbnailMatch) {
                    thumbnail = thumbnailMatch[1].trim();
                }
                const descriptionMatch = metadataStr.match(/description:\s*(.*)/);
                if (descriptionMatch) {
                    description = descriptionMatch[1].trim();
                }
                if (!description) {
                    // Get content after metadata
                    const afterMetadata = content.substring(
                        metadataMatch.index + metadataMatch[0].length
                    );
                    const paragraphMatch = afterMetadata
                        .split('\n\n')
                        .find(p => p.trim() && !p.startsWith('#'));
                    if (paragraphMatch) {
                        description = paragraphMatch.trim().replace(/\[|\]|\(|\)/g, '').substring(0, 160);
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching document:', e);
        }
    }
    const site = new URL(SITE_URL);
    site.pathname += (url.pathname === '/' ? '' : url.pathname);
    site.search = url.search;
    site.hash = url.hash;

    const title = currentDoc?.title || 'Documentation';
    const ogImage = new URL(thumbnail, SITE_URL).href;
    const siteName = indexData.metadata?.site_name || 'Documentation';

    return `
    <meta property="og:title" content="${title} - ${siteName}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${site.href}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:site_name" content="${siteName}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title} - ${siteName}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${ogImage}">`;
}

async function handleRequest(request, SITE_URL, DOCS_URL) {
    const url = new URL(request.url);
    const siteUrlObj = new URL(SITE_URL);
    const pathPrefix = siteUrlObj.pathname;
    
    const strippedPath = url.pathname.startsWith(pathPrefix) 
        ? url.pathname.slice(pathPrefix.length - 1)
        : url.pathname;

    const docUrl = new URL(DOCS_URL);
    docUrl.pathname = strippedPath;
    docUrl.search = url.search;
    docUrl.hash = url.hash;
    
    const response = await fetch(docUrl.toString(), request);
    
    if (url.pathname === pathPrefix || url.pathname === '/') {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            let html = await response.text();
            const ogTags = await generateOGTags(url, SITE_URL, DOCS_URL);
            html = html.replace('<!--ogmetadata-->', ogTags);
            return new Response(html, {
                headers: {
                    'content-type': 'text/html;charset=UTF-8',
                    ...Object.fromEntries(response.headers)
                }
            });
        }
    }
    return new Response(response.body, response);
}

export default {
    async fetch(request, env, ctx) {
        const SITE_URL = env.SITE_URL;
        const DOCS_URL = env.DOCS_URL;
        return handleRequest(request, SITE_URL, DOCS_URL);
    }
};
