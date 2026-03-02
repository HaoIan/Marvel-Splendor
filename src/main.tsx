import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
// Single Page Apps for GitHub Pages (MIT License) - Resolves 404 redirects
(function (l) {
  if (l.search[1] === '/') {
    const decoded = l.search.slice(1).split('&').map(function (s) {
      return s.replace(/~and~/g, '&')
    }).join('?');
    window.history.replaceState(null, '',
      l.pathname.slice(0, -1) + decoded + l.hash
    );
  }
}(window.location));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)