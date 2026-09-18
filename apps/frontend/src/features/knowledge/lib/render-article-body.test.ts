import { describe, expect, it } from 'vitest';
import { renderArticleBody } from './render-article-body';

describe('renderArticleBody', () => {
  it('renders Markdown to HTML', () => {
    const html = renderArticleBody('**Hello** world\n\n- one\n- two');
    expect(html).toContain('<strong>Hello</strong>');
    expect(html).toContain('<li>one</li>');
  });

  it('strips a literal <script> tag embedded in the article body (XSS regression)', () => {
    const malicious = 'Take your medication.<script>window.__pwned = true;</script>';
    const html = renderArticleBody(malicious);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('window.__pwned');
  });

  it('strips an inline event-handler attribute used as an XSS vector', () => {
    const malicious = '<img src="x" onerror="window.__pwned = true">';
    const html = renderArticleBody(malicious);

    expect(html).not.toContain('onerror');
  });

  it('strips a javascript: URL used as an XSS vector', () => {
    const malicious = '[click me](javascript:window.__pwned=true)';
    const html = renderArticleBody(malicious);

    expect(html.toLowerCase()).not.toContain('javascript:');
  });
});
