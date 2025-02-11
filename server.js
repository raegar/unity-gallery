const express = require("express");
const multer = require("multer");
const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path");

const app = express();

// Use multer to temporarily store uploaded ZIP files
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// POST endpoint to handle file upload
app.post("/upload", upload.single("zipfile"), (req, res) => {
    // Expect metadata fields from the form (title, author, projectId)
    const { title, author, projectId } = req.body;
    const zipPath = req.file.path;

    // Determine extraction directory (e.g. public/builds/projectId)
    const extractDir = path.join(__dirname, "public", "builds", projectId);

    // Create the extraction directory if it doesn’t exist
    fs.mkdirSync(extractDir, { recursive: true });

    // Extract the ZIP into the target folder
    fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on("close", () => {
            // Update games.json after extraction
            const gamesJsonPath = path.join(__dirname, "public", "games.json");
            fs.readFile(gamesJsonPath, "utf8", (err, data) => {
                if (err) {
                    return res.status(500).json({ error: "Error reading games.json" });
                }
                let games = [];
                try {
                    games = JSON.parse(data);
                } catch (e) {
                    games = [];
                }
                // Create a new entry using the provided metadata and expected file structure.
                const newGame = {
                    id: projectId,
                    title,
                    author,
                    thumbnail: `/builds/${projectId}/thumbnail.png`, // You can manually create this thumbnail later
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
                    // Remove the temporary ZIP file
                    fs.unlink(zipPath, () => { });
                    res.json({ success: true, game: newGame });
                });
            });
        })
        .on("error", (err) => {
            res.status(500).json({ error: "Error extracting zip file", details: err.message });
        });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
