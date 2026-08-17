import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './Cell';

describe('sanitizeHtml caching', () => {
  it('should cache sanitized HTML and return same result on repeated calls', () => {
    const html1 = '<b>test</b>';
    const html2 = '<u>another</u>';

    // First call - should sanitize via DOM
    const result1 = sanitizeHtml(html1);
    expect(result1).toBe('<b>test</b>');

    // Second call with same input - should return cached result
    const result2 = sanitizeHtml(html1);
    expect(result2).toBe('<b>test</b>');
    expect(result2).toBe(result1);

    // Different input - should sanitize via DOM
    const result3 = sanitizeHtml(html2);
    expect(result3).toBe('<u>another</u>');

    // Original input again - should still be cached
    const result4 = sanitizeHtml(html1);
    expect(result4).toBe('<b>test</b>');
    expect(result4).toBe(result1);
  });

  it('should sanitize and cache HTML with mark tags', () => {
    const html = '<mark data-color="yellow">highlighted</mark>';
    const result1 = sanitizeHtml(html);
    expect(result1).toBe('<mark data-color="yellow">highlighted</mark>');

    const result2 = sanitizeHtml(html);
    expect(result2).toBe(result1);
  });

  it('should handle empty and whitespace content', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml('   ')).toBe('   ');
    
    // Cache should work for these too
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml('   ')).toBe('   ');
  });

  it('should sanitize dangerous HTML and cache the result', () => {
    const dangerous = '<script>alert("xss")</script><b>safe</b>';
    const result1 = sanitizeHtml(dangerous);
    expect(result1).not.toContain('<script>');
    expect(result1).toContain('<b>safe</b>');

    const result2 = sanitizeHtml(dangerous);
    expect(result2).toBe(result1);
  });

  it('should handle complex nested HTML', () => {
    const complex = '<b><u>bold and underline</u></b>';
    const result1 = sanitizeHtml(complex);
    expect(result1).toBe('<b><u>bold and underline</u></b>');

    const result2 = sanitizeHtml(complex);
    expect(result2).toBe(result1);
  });

  it('should preserve multiple mark tags with different colors', () => {
    const multiColor = '<mark data-color="yellow">one</mark> <mark data-color="green">two</mark>';
    const result1 = sanitizeHtml(multiColor);
    expect(result1).toContain('data-color="yellow"');
    expect(result1).toContain('data-color="green"');

    const result2 = sanitizeHtml(multiColor);
    expect(result2).toBe(result1);
  });
});
