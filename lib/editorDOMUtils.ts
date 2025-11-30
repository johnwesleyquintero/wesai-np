
/**
 * Calculates the screen position of the cursor within a textarea.
 * It uses a hidden <pre> element to mirror the textarea's styling and content up to the cursor.
 */
export const getCursorPositionRect = (
    textarea: HTMLTextAreaElement,
    position: number,
    measureRef: HTMLPreElement,
    content: string
): DOMRect => {
    if (!measureRef) return new DOMRect();

    const styles = window.getComputedStyle(textarea);
    const essentialStyles = [
        'font-family', 'font-size', 'font-style', 'font-weight', 'line-height',
        'letter-spacing', 'text-transform', 'padding-top', 'padding-right',
        'padding-bottom', 'padding-left', 'border-top-width', 'border-right-width',
        'border-bottom-width', 'border-left-width', 'box-sizing', 'width', 'text-indent'
    ];
    
    // Reset styles to ensure a clean slate for measurement
    measureRef.style.cssText = '';
    
    essentialStyles.forEach(key => {
        measureRef.style.setProperty(key, styles.getPropertyValue(key));
    });

    measureRef.style.whiteSpace = 'pre-wrap';
    measureRef.style.wordWrap = 'break-word';

    const before = content.substring(0, position);
    const span = document.createElement('span');
    span.textContent = '.'; // Use a non-whitespace character for measurement
    measureRef.textContent = before;
    measureRef.appendChild(span);

    const rect = span.getBoundingClientRect();
    measureRef.textContent = ''; // Clear content to prevent memory leaks

    return rect;
};

/**
 * Extracts the start and end indices and text of the line containing the given position.
 */
export const getLineInfoForPosition = (content: string, position: number) => {
    const start = content.lastIndexOf('\n', position - 1) + 1;
    let end = content.indexOf('\n', position);
    if (end === -1) end = content.length;
    const text = content.substring(start, end).trim();
    return { text, start, end };
};
