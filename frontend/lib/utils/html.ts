/**
 * Strip HTML tags from string
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n');
  
  // Trim extra whitespace
  return text.trim();
}

/**
 * Convert plain text to HTML with basic formatting
 */
export function textToHtml(text: string): string {
  if (!text) return '';
  
  // Convert newlines to <br> and wrap in <p>
  return `<p>${text.replace(/\n/g, '<br>')}</p>`;
}
