import React from 'react';
import { createRoot } from 'react-dom/client';
import { WidgetApp } from './WidgetApp';
import './widget.css';

const root = createRoot(document.getElementById('root')!);
root.render(<WidgetApp />);
