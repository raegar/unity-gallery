// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Gallery from "./Gallery";
import GamePlayer from "./GamePlayer";
import UploadGame from "./UploadGame";
import EditGame from "./EditGame";

function App() {
  return (
    <Router>
      <nav style={{ padding: "1rem", backgroundColor: "#071d49" }}>
        <Link to="/" style={{ color: "#ffd100", marginRight: "1rem", textDecoration: "none" }}>Gallery</Link>
        <Link to="/upload" style={{ color: "#ffd100", textDecoration: "none" }}>Upload Game</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/play/:id" element={<GamePlayer />} />
        <Route path="/upload" element={<UploadGame />} />
        <Route path="/edit/:id" element={<EditGame />} />
      </Routes>
    </Router>
  );
}

export default App;
