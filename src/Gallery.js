// src/Gallery.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Gallery() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    // Fetch the local JSON file listing the games.
    fetch('/games.json')
      .then((res) => res.json())
      .then((data) => setGames(data))
      .catch((error) => console.error('Error fetching games:', error));
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Unity Games Gallery</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        {games.map((game) => (
          <div key={game.id} style={{ border: '1px solid #ccc', padding: '10px' }}>
            <img src={game.thumbnail} alt={game.title} style={{ width: '200px', height: 'auto' }} />
            <h3>{game.title}</h3>
            <Link to={`/play/${game.id}`}>Play Game</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Gallery;
