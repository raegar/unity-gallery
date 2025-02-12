// src/EditGame.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import "./EditGame.css"; // Assuming you have some CSS for additional styling

function EditGame() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [moduleCode, setModuleCode] = useState('');
    const [uploadDate, setUploadDate] = useState(''); // Expecting a date string (YYYY-MM-DD)
    const [newThumbnail, setNewThumbnail] = useState(null);
    const [status, setStatus] = useState('');
    const [dataFetched, setDataFetched] = useState(false);

    // Reset dataFetched when ID changes
    useEffect(() => {
        setDataFetched(false);
    }, [id]);

    // Fetch game data only once per ID change
    useEffect(() => {
        if (!dataFetched) {
            console.log("Fetching game data for id:", id);
            fetch('/games.json')
                .then(res => res.json())
                .then(data => {
                    const foundGame = data.find(g => g.id === id);
                    if (foundGame) {
                        setGame(foundGame);
                        setTitle(foundGame.title);
                        setAuthor(foundGame.author);
                        setModuleCode(foundGame.moduleCode || '');
                        // Convert foundGame.uploadDate to YYYY-MM-DD if it exists, otherwise default to today.
                        const dateValue = foundGame.uploadDate
                            ? new Date(foundGame.uploadDate).toISOString().split('T')[0]
                            : new Date().toISOString().split('T')[0];
                        setUploadDate(dateValue);
                    } else {
                        setStatus('Game not found.');
                    }
                    setDataFetched(true);
                })
                .catch(err => {
                    console.error(err);
                    setStatus('Error fetching game data.');
                    setDataFetched(true);
                });
        }
    }, [dataFetched, id]);


    const handleUpdate = async (e) => {
        e.preventDefault();
        setStatus('Updating...');
        try {
            // Update metadata (title, author, moduleCode, uploadDate)
            const response = await fetch(`/games/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, author, moduleCode, uploadDate })
            });
            const result = await response.json();
            if (result.success) {
                if (newThumbnail) {
                    const formData = new FormData();
                    formData.append("thumbnail", newThumbnail);
                    const thumbResponse = await fetch(`/games/${id}/thumbnail`, {
                        method: 'PUT',
                        body: formData
                    });
                    const thumbResult = await thumbResponse.json();
                    if (thumbResult.success) {
                        setStatus('Update successful, thumbnail updated!');
                    } else {
                        setStatus('Update successful, but thumbnail update failed: ' + thumbResult.error);
                    }
                } else {
                    setStatus('Update successful!');
                }
                setGame(result.game);
            } else {
                setStatus('Update failed: ' + result.error);
            }
        } catch (error) {
            setStatus('Update error: ' + error.message);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this game? This action cannot be undone.")) return;
        setStatus('Deleting...');
        try {
            const response = await fetch(`/games/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                setStatus('Game deleted!');
                navigate('/');  // Redirect to gallery after deletion
            } else {
                setStatus('Delete failed: ' + result.error);
            }
        } catch (error) {
            setStatus('Delete error: ' + error.message);
        }
    };

    if (!game) {
        return <div style={{ textAlign: 'center', marginTop: '2rem' }}>{status}</div>;
    }

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem' }}>
            <h2>Edit Game Metadata</h2>
            <form onSubmit={handleUpdate}>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        Title:
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        Author:
                        <input
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        Module Code:
                        <input
                            type="text"
                            value={moduleCode}
                            onChange={(e) => setModuleCode(e.target.value)}
                            placeholder="e.g., MOD008525"
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        Upload Date:
                        <input
                            type="date"
                            value={uploadDate}
                            onChange={(e) => setUploadDate(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>
                <div className="edit-image-wrapper" style={{ marginBottom: '1rem' }}>
                    <img src={game.thumbnail} alt={game.title} style={{ maxWidth: '100%' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        New Thumbnail (optional, 640x480 recommended):
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewThumbnail(e.target.files[0])}
                        />
                    </label>
                </div>
                <button
                    type="submit"
                    style={{ padding: '0.5rem 1rem', marginRight: '1rem', backgroundColor: '#071d49', color: '#fff', border: 'none', borderRadius: '4px' }}
                >
                    Update
                </button>
                <button
                    type="button"
                    onClick={handleDelete}
                    style={{ padding: '0.5rem 1rem', backgroundColor: 'red', color: '#fff', border: 'none', borderRadius: '4px' }}
                >
                    Delete Game
                </button>
            </form>
            {status && <p style={{ marginTop: '1rem' }}>{status}</p>}
            <p style={{ marginTop: '2rem' }}>
                <Link to="/">← Back to Gallery</Link>
            </p>
        </div>
    );
}

export default EditGame;
