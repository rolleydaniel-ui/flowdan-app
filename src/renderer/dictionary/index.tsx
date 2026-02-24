import React from 'react';
import { createRoot } from 'react-dom/client';
import '../globals.css';
import { DictionaryApp } from './DictionaryApp';

const root = createRoot(document.getElementById('root')!);
root.render(<DictionaryApp />);
