import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { VoultProvider } from '@voult/react';
import App from './App.jsx';
import { installInspector } from './playground/inspector.js';
import './styles.css';

installInspector(window); // playground: record every /api/* call for the API calls panel

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VoultProvider apiBase="/api/auth">
      <App />
    </VoultProvider>
  </StrictMode>
);
