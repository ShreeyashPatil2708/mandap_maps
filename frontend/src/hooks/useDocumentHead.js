import { useEffect } from 'react';
import { metaTags } from '../seo.js';

/**
 * Keeps the document head in step with the current screen after a client-side
 * navigation. The prerendered HTML already ships the right tags for a fresh
 * page load (scripts/prerender.mjs writes them from the same seoFor() data),
 * so this only has to update them as the visitor moves around.
 *
 * Tags written from here carry data-mm-seo, so a screen can remove what the
 * previous one added (an og:image, say) instead of leaving it behind.
 */
function upsertMeta(tag, kept) {
  const attribute = tag.property ? 'property' : 'name';
  const key = tag.property || tag.name;
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', tag.content);
  element.setAttribute('data-mm-seo', '');
  kept.add(element);
}

function setCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function setJsonLd(nodes) {
  document.head
    .querySelectorAll('script[type="application/ld+json"][data-mm-seo]')
    .forEach((element) => element.remove());

  for (const node of nodes) {
    // A JSON-LD block is data, not code: browsers never execute it, so the
    // page's script-src CSP does not apply.
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-mm-seo', '');
    script.textContent = JSON.stringify(node);
    document.head.appendChild(script);
  }
}

export function useDocumentHead(seo, jsonLd) {
  useEffect(() => {
    document.title = seo.title;

    const kept = new Set();
    metaTags(seo).forEach((tag) => upsertMeta(tag, kept));
    document.head.querySelectorAll('meta[data-mm-seo]').forEach((element) => {
      if (!kept.has(element)) element.remove();
    });

    setCanonical(seo.canonical);
    setJsonLd(jsonLd);
  }, [seo, jsonLd]);
}
