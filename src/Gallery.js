// src/Gallery.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Gallery.css"; // Import the CSS file below

function Gallery() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    fetch("/games.json")
      .then((res) => res.json())
      .then((data) => setGames(data))
      .catch((error) => console.error("Error fetching games:", error));
  }, []);

  return (
    <div className="gallery">
      {games.map((game) => (
        <div key={game.id} className="gallery-item">
          <div className="gallery-image-wrapper">
            <img src={game.thumbnail} alt={game.title} />
          </div>
          <h3>{game.title}</h3>
          <Link className="play-button" to={`/play/${game.id}`}>
            Play Game
          </Link>
        </div>
      ))}
    </div>
  );
}

export default Gallery;
