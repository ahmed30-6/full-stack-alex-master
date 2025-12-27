import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Watermark from "./components/Watermark.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* Watermark يظهر فوق كل التطبيق */}
    <Watermark />

    {/* التطبيق الأصلي */}
    <App />
  </React.StrictMode>
);


/*
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

*/
