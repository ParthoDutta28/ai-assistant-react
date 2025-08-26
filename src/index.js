import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Make sure this file also exists in your src folder
import App from './App'; // Imports your main App component

// Create a React root to render your application
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render your App component into the root DOM element
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);