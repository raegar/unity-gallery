// server.js
const express = require("express");
const multer = require("multer");
const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path");

const app = express();

// Configure multer to handle multiple fields
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/upload", upload.fields([
    { name: "zipfile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
]), (req, res) => {
    const { title, author, projectId, overwrite } = req.body;
    // Retrieve files from req.files
    const zipFile = req.files["zipfile"] ? req.files["zipfile"][0] : null;
    const thumbnailFile = req.files["thumbnail"] ? req.files["thumbnail"][0] : null;

    if (!zipFile || !title || !author || !projectId) {
        return res.status(400).json({ error: "Missing required fields or files." });
    }

    const extractDir = path.join(__dirname, "public", "builds", projectId);
    const gamesJsonPath = path.join(__dirname, "public", "games.json");

    // Read current games.json (or use an empty array if not available)
    let games = [];
    try {
        games = JSON.parse(fs.readFileSync(gamesJsonPath, "utf8"));
    } catch (err) {
        games = [];
    }

    const folderExists = fs.existsSync(extractDir);
    const gameIndex = games.findIndex(game => game.id === projectId);

    if ((folderExists || gameIndex !== -1) && overwrite !== "true") {
        return res.status(400).json({
            error: "A game with that project ID already exists. Set overwrite=true to replace it."
        });
    }

    // If overwrite is requested, remove the existing folder and JSON entry if they exist.
    if (folderExists && overwrite === "true") {
        try {
            fs.rmSync(extractDir, { recursive: true, force: true });
        } catch (err) {
            console.error("Error deleting existing folder:", err);
            return res.status(500).json({ error: "Error deleting existing project folder." });
        }
    }
    if (gameIndex !== -1 && overwrite === "true") {
        games.splice(gameIndex, 1);
    }

    // Create the extraction directory
    fs.mkdirSync(extractDir, { recursive: true });

    // Process the thumbnail if provided
    if (thumbnailFile) {
        // Define destination path for thumbnail (e.g., "thumbnail.png")
        const thumbDest = path.join(extractDir, "thumbnail.png");
        // Move the file from the temporary folder to the destination.
        try {
            fs.renameSync(thumbnailFile.path, thumbDest);
        } catch (err) {
            console.error("Error moving thumbnail file:", err);
            return res.status(500).json({ error: "Error processing thumbnail." });
        }
    }

    // Extract the ZIP file into the designated folder
    fs.createReadStream(zipFile.path)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on("close", () => {
            // Construct a new game entry using the provided metadata.
            const newGame = {
                id: projectId,
                title,
                author,
                thumbnail: `/builds/${projectId}/thumbnail.png`, // Thumbnail URL
                build: {
                    loaderUrl: `/builds/${projectId}/Build/${projectId}.loader.js`,
                    dataUrl: `/builds/${projectId}/Build/${projectId}.data`,
                    frameworkUrl: `/builds/${projectId}/Build/${projectId}.framework.js`,
                    codeUrl: `/builds/${projectId}/Build/${projectId}.wasm`
                }
            };

            games.push(newGame);

            fs.writeFile(gamesJsonPath, JSON.stringify(games, null, 2), (err) => {
                if (err) {
                    return res.status(500).json({ error: "Error updating games.json" });
                }
                // Clean up the uploaded ZIP file
                fs.unlink(zipFile.path, () => { });
                res.json({ success: true, game: newGame });
            });
        })
        .on("error", (err) => {
            res.status(500).json({ error: "Error extracting zip file", details: err.message });
        });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
