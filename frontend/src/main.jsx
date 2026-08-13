import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { RouteProvider } from './context/RouteContext.jsx';
import { GanpatisProvider } from './context/GanpatisContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GanpatisProvider>
      <RouteProvider>
        <App />
      </RouteProvider>
    </GanpatisProvider>
  </React.StrictMode>
);
