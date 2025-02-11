// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Gallery from './Gallery';
import GamePlayer from './GamePlayer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/play/:id" element={<GamePlayer />} />
      </Routes>
    </Router>
  );
}

export default App;
