
export const generatePreviewFromMarkdown = (markdown: string, length: number = 160): string => {
    if (!markdown) {
        return '';
    }

    let plainText = markdown;

    // A series of replacements to strip Markdown syntax for a clean preview.
    plainText = plainText
        // Remove headings
        .replace(/#{1,6}\s/g, '')
        // Remove images
        .replace(/!\[.*?\]\(.*?\)/g, '')
        // Remove links, keeping the text
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        // Remove bold, italic, strikethrough
        .replace(/(\*\*|__|\*|_|~~)(.*?)\1/g, '$2')
        // Remove blockquotes
        .replace(/^>\s?/gm, '')
        // Remove horizontal rules
        .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '')
        // Remove code blocks and inline code
        .replace(/`{3,}[\s\S]*?`{3,}/g, '[Code Block]')
        .replace(/`(.+?)`/g, '$1')
        // Collapse newlines and multiple spaces into a single space
        .replace(/\s\s+/g, ' ')
        .trim();

    if (plainText.length <= length) {
        return plainText;
    }

    return plainText.substring(0, length).trim() + '...';
};
