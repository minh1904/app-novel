import './index.css';
import { addCollection } from '@iconify/react';
import solarIcons from '@iconify-json/solar/icons.json';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

addCollection(solarIcons);

document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
