import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { RouteProvider } from './context/RouteContext.jsx';
import { GanpatisProvider } from './context/GanpatisContext.jsx';
import { SavedProvider } from './context/SavedContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GanpatisProvider>
      <RouteProvider>
        <SavedProvider>
          <App />
        </SavedProvider>
      </RouteProvider>
    </GanpatisProvider>
  </React.StrictMode>
);
