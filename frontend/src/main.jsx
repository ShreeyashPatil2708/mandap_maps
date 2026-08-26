import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { RouteProvider } from './context/RouteContext.jsx';
import { GanpatisProvider } from './context/GanpatisContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GanpatisProvider>
        <RouteProvider>
          <App />
        </RouteProvider>
      </GanpatisProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
