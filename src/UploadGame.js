// src/UploadGame.js
import React, { useState } from "react";

function UploadGame() {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [projectId, setProjectId] = useState("");
    const [zipFile, setZipFile] = useState(null);
    const [thumbnail, setThumbnail] = useState(null); // new state for thumbnail
    const [overwrite, setOverwrite] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!zipFile || !title || !author || !projectId) {
            setUploadStatus("Please fill in all required fields and select a ZIP file.");
            return;
        }
        setUploadStatus("Uploading...");

        const formData = new FormData();
        formData.append("zipfile", zipFile);
        formData.append("title", title);
        formData.append("author", author);
        formData.append("projectId", projectId);
        formData.append("overwrite", overwrite ? "true" : "false");

        // If a thumbnail was selected, append it.
        if (thumbnail) {
            formData.append("thumbnail", thumbnail);
        }

        try {
            const response = await fetch("/upload", {
                method: "POST",
                body: formData,
            });
            const result = await response.json();
            if (result.success) {
                setUploadStatus("Upload successful!");
            } else {
                setUploadStatus("Upload failed: " + (result.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadStatus("Upload error: " + error.message);
        }
    };

    return (
        <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "1rem", background: "#f2f3f6", borderRadius: "8px" }}>
            <h2>Upload a New Game</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        Title:
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: "100%" }} />
                    </label>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        Author:
                        <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} required style={{ width: "100%" }} />
                    </label>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        Project ID:
                        <input type="text" value={projectId} onChange={(e) => setProjectId(e.target.value)} required style={{ width: "100%" }} />
                    </label>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        ZIP File:
                        <input type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files[0])} required />
                    </label>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        Thumbnail (640x480 recommended):
                        <input type="file" accept="image/*" onChange={(e) => setThumbnail(e.target.files[0])} />
                    </label>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        Overwrite if exists:
                        <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                    </label>
                </div>
                <button type="submit" style={{ padding: "0.5rem 1rem", backgroundColor: "#071d49", color: "#fff", border: "none", borderRadius: "4px" }}>
                    Upload Game
                </button>
            </form>
            {uploadStatus && <p style={{ marginTop: "1rem" }}>{uploadStatus}</p>}
        </div>
    );
}

export default UploadGame;
