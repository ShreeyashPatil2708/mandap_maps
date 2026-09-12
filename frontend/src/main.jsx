import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { RouteProvider } from './context/RouteContext.jsx';
import { GanpatisProvider } from './context/GanpatisContext.jsx';
import { CrowdProvider } from './context/CrowdContext.jsx';
import { fetchGanpatis } from './services/ganpatis.js';
import './index.css';

const container = document.getElementById('root');

// The build prerenders every route into real HTML (scripts/prerender.mjs), so
// in production this container already holds the page. React then takes over
// and renders the same screen from live API data.
const prerendered = container.childElementCount > 0;

function mount(initialData) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary>
        <GanpatisProvider initialData={initialData}>
          <RouteProvider>
            <CrowdProvider>
              <App />
            </CrowdProvider>
          </RouteProvider>
        </GanpatisProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

if (prerendered) {
  // Wait for the data before taking over, so the prerendered content is never
  // replaced by a loading state. If the API cannot be reached, leave the page
  // as it is: the content is already on screen and every link is a real <a>,
  // which reads better than swapping it for an error message.
  fetchGanpatis()
    .then(mount)
    .catch((error) => {
      console.error('Could not load pandals; keeping the prerendered page.', error);
    });
} else {
  // Dev server (empty container): the provider fetches on mount as before.
  mount(undefined);
}
