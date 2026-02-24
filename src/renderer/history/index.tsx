import React from 'react';
import { createRoot } from 'react-dom/client';
import '../globals.css';
import { HistoryApp } from './HistoryApp';

const root = createRoot(document.getElementById('root')!);
root.render(<HistoryApp />);
