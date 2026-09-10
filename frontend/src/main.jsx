import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { RouteProvider } from './context/RouteContext.jsx';
import { GanpatisProvider } from './context/GanpatisContext.jsx';
import './index.css';
import { CrowdProvider } from './context/CrowdContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GanpatisProvider>
      <RouteProvider>
        <CrowdProvider>
          <App />
        </CrowdProvider>
      </RouteProvider>
    </GanpatisProvider>
  </React.StrictMode>
);





<GanpatisProvider>
  <RouteProvider>
    <CrowdProvider>
      <App />
    </CrowdProvider>
  </RouteProvider>
</GanpatisProvider>