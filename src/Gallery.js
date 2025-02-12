// src/Gallery.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "./0_ARU-Peterborough-blue-RGB1.png";
import { FaEdit } from "react-icons/fa"; // FontAwesome icons
import "./Gallery.css";

// Helper: Fisher–Yates shuffle algorithm
const shuffleArray = (array) => {
  const newArray = array.slice();
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

function Gallery() {
  const [games, setGames] = useState([]);
  const [moduleFilter, setModuleFilter] = useState("");
  const [sortField, setSortField] = useState("random");

  useEffect(() => {
    fetch("/games.json")
      .then((res) => res.json())
      .then((data) => {
        // Shuffle the games array initially
        setGames(shuffleArray(data));
      })
      .catch((error) => console.error("Error fetching games:", error));
  }, []);

  // Derive a list of unique module codes from the games array (exclude empty values)
  const moduleCodes = Array.from(
    new Set(games.map((game) => game.moduleCode).filter(code => code && code.trim() !== ""))
  );

  // Filter games by module code if a specific module is selected.
  const filteredGames = games.filter((game) => {
    if (!moduleFilter) return true; // if no filter selected, show all
    return game.moduleCode === moduleFilter;
  });

  // Sort the filtered games based on sortField.
  let sortedGames = [...filteredGames];
  if (sortField === "title") {
    sortedGames.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortField === "uploadDate") {
    sortedGames.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
  } else if (sortField === "moduleCode") {
    sortedGames.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
  } else if (sortField === "author") {
    sortedGames.sort((a, b) => a.author.localeCompare(b.author));
  } else if (sortField === "random") {
    sortedGames = shuffleArray(sortedGames);
  }

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <img src={logo} alt="University Logo" className="gallery-logo" />
        <h1>Student Game Showcase</h1>
        <p>
          Welcome to our gallery of student games. Explore innovative projects and interactive
          experiences built by our talented students.
        </p>
      </header>

      {/* Filter and Sort Controls */}
      <div className="gallery-filters" style={{ padding: "1rem", textAlign: "center" }}>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          style={{ marginRight: "1rem", padding: "0.5rem" }}
        >
          <option value="">All Modules</option>
          {moduleCodes.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
          style={{ padding: "0.5rem" }}
        >
          <option value="random">Random</option>
          <option value="title">Title</option>
          <option value="uploadDate">Upload Date</option>
          <option value="moduleCode">Module Code</option>
          <option value="author">Author</option>
        </select>
      </div>

      <div className="gallery">
        {sortedGames.map((game) => (
          <div key={game.id} className="gallery-item">
            <div className="thumbnail-container" style={{ position: "relative" }}>
              <img src={game.thumbnail} alt={game.title} style={{ width: "100%" }} />
              <Link
                to={`/edit/${game.id}`}
                className="edit-icon"
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  background: "rgba(0, 0, 0, 0.6)",
                  padding: "4px",
                  borderRadius: "50%",
                  color: "#fff",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                <FaEdit size={16} />
              </Link>
            </div>
            <h3>{game.title}</h3>
            <p className="game-author">by {game.author}</p>
            <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
              <Link className="play-button" to={`/play/${game.id}`}>
                Play Game
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Gallery;
