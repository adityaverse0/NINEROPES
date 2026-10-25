import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker } from './services/pwa';
import './index.css';

// Initialize Progressive Web App engine & Service Worker
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
