// src/GamePlayer.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import UnityGame from "./UnityGame";  // import your UnityGame component

function GamePlayer() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the game metadata from the public folder.
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
        console.error("Error fetching games:", err);
        setError("Error loading game metadata.");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div>Loading game metadata...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>{game.title}</h1>
      {/* Pass the build configuration to the UnityGame component */}
      <UnityGame build={game.build} />
      <br />
      <Link to="/">Back to Gallery</Link>
    </div>
  );
}

export default GamePlayer;
