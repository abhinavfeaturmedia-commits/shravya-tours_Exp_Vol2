/**
 * Copies the given text to the clipboard.
 * Uses the modern navigator.clipboard API if available and inside a secure context.
 * Falls back to document.execCommand('copy') in insecure contexts (e.g. HTTP IP addresses).
 * 
 * @param text The string content to copy to the clipboard.
 * @returns A promise that resolves to true if copied successfully, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Check if navigator.clipboard is supported
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Modern navigator.clipboard failed, trying fallback copy...', err);
    }
  }

  // Fallback for insecure/HTTP contexts
  const textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Style to avoid visual disruption or scrolling issues
  textArea.style.position = 'fixed';
  textArea.style.top = '0px';
  textArea.style.left = '0px';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0px';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copyToClipboard failed:', err);
    document.body.removeChild(textArea);
    return false;
  }
}
