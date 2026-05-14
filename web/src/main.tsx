import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import Explore from './pages/Explore';
import Host from './pages/Host';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Landing />} />
          <Route path="explore" element={<Explore />} />
          <Route path="host" element={<Host />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
