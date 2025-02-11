import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "./0_ARU-Peterborough-blue-RGB1.png"; // Import the logo from src
import "./Gallery.css"; // Import the CSS file

function Gallery() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    fetch("/games.json")
      .then((res) => res.json())
      .then((data) => setGames(data))
      .catch((error) => console.error("Error fetching games:", error));
  }, []);

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <img src={logo} alt="University Logo" className="gallery-logo" />
        <h1>Student Game Showcase</h1>
        <p>
          Welcome to our gallery of student games. Explore innovative projects
          and cutting‐edge interactive experiences built by our talented
          students.
        </p>
      </header>

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
    </div>
  );
}

export default Gallery;
