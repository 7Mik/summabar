/**
 * Safely parses and sets HTML content using DOMParser and replaceChildren
 * to comply with Mozilla AMO security linter rules (preventing innerHTML warnings).
 */
export function setSanitizedHTML(target: HTMLElement, htmlString: string): void {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  target.replaceChildren(...Array.from(doc.body.childNodes));
}
