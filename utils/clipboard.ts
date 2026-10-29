/**
 * Bulletproof clipboard copy utility.
 * - Uses navigator.clipboard.writeText ONLY in secure contexts (HTTPS or localhost).
 * - Immediately falls back to document.execCommand('copy') on insecure/HTTP network IP origins (e.g. http://192.168.x.x:3000).
 * - Provides window.prompt fallback if browser sandbox disables both.
 * 
 * @param text The string content to copy to the clipboard.
 * @returns A promise that resolves to true if copied successfully, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Check if we are in a secure context where navigator.clipboard is permitted
  const isSecure = typeof window !== 'undefined' && (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  if (isSecure && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[copyToClipboard] navigator.clipboard.writeText failed, falling back to DOM execCommand...', err);
    }
  }

  // 2. Synchronous DOM fallback for HTTP, local IP addresses, and non-secure origins
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.setAttribute('readonly', '');
      
      // Position off-screen without scrolling or visual glitch
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.style.fontSize = '16px'; // Prevents iOS zooming
      
      document.body.appendChild(textArea);
      
      // Select text accurately
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        return true;
      }
    } catch (err) {
      console.warn('[copyToClipboard] document.execCommand failed:', err);
    }
  }

  // 3. Last-resort fallback for strictly restricted browser environments
  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    try {
      window.prompt('Copy this link (Ctrl+C / Cmd+C):', text);
      return true;
    } catch {}
  }

  return false;
}
