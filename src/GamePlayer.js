// src/GamePlayer.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import UnityGame from "./UnityGame"; // Component that wraps your useUnityContext hook
import logo from "./0_ARU-Peterborough-blue-RGB1.png"; // Your logo
import "./GamePlayer.css"; // Your CSS file

function GamePlayer() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/games.json")
      .then((res) => res.json())
      .then((games) => {
        const foundGame = games.find((g) => g.id === id);
        if (!foundGame) {
          setError("Game not found.");
          setLoading(false);
          return;
        }
        setGame(foundGame);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading game metadata:", err);
        setError("Error loading game metadata.");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="game-loading">Loading game metadata...</div>;
  if (error) return <div className="game-error">{error}</div>;

  return (
    <div className="game-page">
      <header className="game-header">
        <h1>{game.title}</h1>
        <p className="game-author-light">by {game.author}</p>
      </header>
      <main className="game-content">
        <div className="unity-wrapper">
          <UnityGame build={game.build} />
        </div>
      </main>
      <footer className="game-footer">
        <Link className="back-button" to="/">← Back to Gallery</Link>
        {/* Add the Edit Game link here */}
        <Link className="edit-button" to={`/edit/${game.id}`}>
          Edit Game
        </Link>
      </footer>
    </div>
  );
}

export default GamePlayer;
