import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { RouteProvider } from './context/RouteContext.jsx';
import { GanpatisProvider } from './context/GanpatisContext.jsx';
import { CrowdProvider } from './context/CrowdContext.jsx';

// Build-time entry point. `vite build --ssr` bundles this, and
// scripts/prerender.mjs calls render() once per route to write real HTML into
// dist, so a crawler (or a visitor on a slow connection) gets the content
// without running the app. The provider tree mirrors main.jsx exactly.
//
// The SEO helpers are re-exported so the prerender script works off this one
// bundle instead of resolving app source files itself.
export { PATHS, ganpatiPath, parsePath } from './router.js';
export { SITE_NAME, SITE_URL, absoluteUrl, jsonLdFor, metaTags, seoFor } from './seo.js';

export function render(path, ganpatis) {
  return renderToString(
    <StrictMode>
      <ErrorBoundary>
        <GanpatisProvider initialData={ganpatis}>
          <RouteProvider>
            <CrowdProvider>
              <App initialPath={path} ssr />
            </CrowdProvider>
          </RouteProvider>
        </GanpatisProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
