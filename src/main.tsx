import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against third-party script background DOM style access errors (e.g. reCAPTCHA iframe badge cleanup)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message && (event.message.includes("reading 'style'") || event.message.includes("Cannot read properties of null"))) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
