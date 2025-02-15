import React, { useState } from "react";

function UploadGame() {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [projectId, setProjectId] = useState("");
    const [projectIdManuallyChanged, setProjectIdManuallyChanged] = useState(false);
    const [moduleCode, setModuleCode] = useState("");
    const [zipFile, setZipFile] = useState(null);
    const [thumbnail, setThumbnail] = useState(null);
    const [overwrite, setOverwrite] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [useGitHub, setUseGitHub] = useState(false);
    const [gitHubUrl, setGitHubUrl] = useState("");
    const [assetName, setAssetName] = useState("");

    // When the Title changes, update title state and auto-generate projectId if not manually changed.
    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        if (!projectIdManuallyChanged) {
            const newProjectId = newTitle.replace(/\s+/g, "");
            setProjectId(newProjectId);
        }
    };

    // Update projectId state when edited manually.
    const handleProjectIdChange = (e) => {
        setProjectId(e.target.value);
        setProjectIdManuallyChanged(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title || !author || !projectId) {
            setUploadStatus("Please fill in all required fields.");
            return;
        }

        setUploadStatus("Processing...");

        const formData = new FormData();
        formData.append("title", title);
        formData.append("author", author);
        formData.append("projectId", projectId);
        formData.append("overwrite", overwrite ? "true" : "false");
        // Always send moduleCode (even if empty) so that the server always receives the field.
        formData.append("moduleCode", moduleCode);
        if (thumbnail) formData.append("thumbnail", thumbnail);

        try {
            if (useGitHub) {
                if (!gitHubUrl) {
                    setUploadStatus("Please provide a valid GitHub repository URL.");
                    return;
                }

                // Extract owner and repo from the provided GitHub URL.
                const match = gitHubUrl.match(/https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/);
                if (!match) {
                    setUploadStatus("Invalid GitHub repository URL.");
                    return;
                }
                const owner = match[1];
                const repo = match[2];

                let releaseData;
                // Attempt to fetch the latest (stable) release.
                let releaseResponse = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/releases/latest`
                );

                if (!releaseResponse.ok) {
                    // If no stable release is available, fetch all releases and pick the first pre‑release.
                    const releasesResponse = await fetch(
                        `https://api.github.com/repos/${owner}/${repo}/releases`
                    );
                    if (!releasesResponse.ok) {
                        setUploadStatus("Failed to fetch releases from GitHub.");
                        return;
                    }
                    const releases = await releasesResponse.json();
                    const preRelease = releases.find((release) => release.prerelease);
                    if (!preRelease) {
                        setUploadStatus("No stable release or pre-release found on GitHub.");
                        return;
                    }
                    releaseData = preRelease;
                } else {
                    releaseData = await releaseResponse.json();
                }

                const tag = releaseData.tag_name; // e.g., "v0.0.1"

                // Construct the proxy URL. If assetName is provided, append it.
                let proxyUrl = `http://localhost:3001/proxy/github/${owner}/${repo}/${tag}`;
                if (assetName.trim() !== "") {
                    proxyUrl += `/${assetName.trim()}`;
                }

                // Fetch the ZIP file via the proxy.
                const zipResponse = await fetch(proxyUrl);
                if (!zipResponse.ok) {
                    setUploadStatus("Failed to download the ZIP file from the proxy.");
                    return;
                }
                const zipBlob = await zipResponse.blob();
                const zipFileFromGitHub = new File(
                    [zipBlob],
                    assetName.trim() || `${repo}-${tag}.zip`,
                    { type: "application/zip" }
                );
                formData.append("zipfile", zipFileFromGitHub);
            } else {
                if (!zipFile) {
                    setUploadStatus("Please select a ZIP file to upload.");
                    return;
                }
                formData.append("zipfile", zipFile);
            }

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
                        <input
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            required
                            style={{ width: "100%" }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        Author:
                        <input
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            required
                            style={{ width: "100%" }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        Project ID:
                        <input
                            type="text"
                            value={projectId}
                            onChange={handleProjectIdChange}
                            required
                            style={{ width: "100%" }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        Module Code (optional):
                        <input
                            type="text"
                            value={moduleCode}
                            onChange={(e) => setModuleCode(e.target.value)}
                            placeholder="e.g., MOD001234"
                            style={{ width: "100%" }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label>
                        Use GitHub URL:
                        <input
                            type="checkbox"
                            checked={useGitHub}
                            onChange={(e) => setUseGitHub(e.target.checked)}
                        />
                    </label>
                </div>

                {useGitHub ? (
                    <>
                        <div style={{ marginBottom: "1rem" }}>
                            <label>
                                GitHub Repository URL:
                                <input
                                    type="url"
                                    value={gitHubUrl}
                                    onChange={(e) => setGitHubUrl(e.target.value)}
                                    required
                                    style={{ width: "100%" }}
                                />
                            </label>
                        </div>
                        <div style={{ marginBottom: "1rem" }}>
                            <label>
                                Asset Name (optional):
                                <input
                                    type="text"
                                    value={assetName}
                                    onChange={(e) => setAssetName(e.target.value)}
                                    placeholder="e.g., WordFight.zip"
                                    style={{ width: "100%" }}
                                />
                            </label>
                        </div>
                    </>
                ) : (
                    <div style={{ marginBottom: "1rem" }}>
                        <label>
                            ZIP File:
                            <input
                                type="file"
                                accept=".zip"
                                onChange={(e) => setZipFile(e.target.files[0])}
                                required
                            />
                        </label>
                    </div>
                )}

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
                <button
                    type="submit"
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#071d49",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Upload Game
                </button>
            </form>
            {uploadStatus && <p style={{ marginTop: "1rem" }}>{uploadStatus}</p>}
        </div>
    );
}

export default UploadGame;
