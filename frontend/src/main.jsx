import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { VoultProvider } from '@voult/react';
import './styles.css';
import Playground from './playground/Playground.jsx';
import { installInspector } from './playground/inspector.js';

installInspector(window); // playground: record every /api/* call for the API calls panel

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VoultProvider apiBase="/api/auth">
      <Playground />
    </VoultProvider>
  </StrictMode>
);
