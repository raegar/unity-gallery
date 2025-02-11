// server.js
const express = require("express");
const multer = require("multer");
const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const decompressFile = (filePath, extension) => {
    return new Promise((resolve, reject) => {
        // Remove the extension (.gz or .br) from the filename to get the target name.
        const newFilePath = filePath.replace(extension, "");
        const readStream = fs.createReadStream(filePath);
        const writeStream = fs.createWriteStream(newFilePath);
        // Choose the correct decompression stream based on the extension.
        const decompress = extension === ".gz"
            ? zlib.createGunzip()
            : zlib.createBrotliDecompress();

        readStream
            .pipe(decompress)
            .pipe(writeStream)
            .on("finish", () => {
                // Optionally remove the compressed file.
                fs.unlinkSync(filePath);
                resolve(newFilePath);
            })
            .on("error", reject);
    });
};

const decompressFilesInFolder = (folderPath) => {
    return new Promise((resolve, reject) => {
        fs.readdir(folderPath, (err, files) => {
            if (err) return reject(err);
            // Create an array of promises for each decompression operation.
            const decompressPromises = files.map((file) => {
                const filePath = path.join(folderPath, file);
                if (file.endsWith(".gz")) {
                    return decompressFile(filePath, ".gz");
                } else if (file.endsWith(".br")) {
                    return decompressFile(filePath, ".br");
                } else {
                    return Promise.resolve();
                }
            });
            Promise.all(decompressPromises).then(resolve).catch(reject);
        });
    });
};


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
            // After extraction, decompress any compressed files in the Build folder.
            const buildFolder = path.join(extractDir, "Build");
            decompressFilesInFolder(buildFolder)
                .then(() => {
                    // Now, all compressed files should be replaced with uncompressed versions.
                    const newGame = {
                        id: projectId,
                        title,
                        author,
                        thumbnail: `/builds/${projectId}/thumbnail.png`,
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
                        // Remove the uploaded ZIP file
                        fs.unlink(zipFile.path, () => { });
                        res.json({ success: true, game: newGame });
                    });
                })
                .catch((err) => {
                    console.error("Error decompressing files:", err);
                    res.status(500).json({ error: "Error decompressing build files" });
                });
        })
        .on("error", (err) => {
            res.status(500).json({ error: "Error extracting zip file", details: err.message });
        });
});

app.put("/games/:id", (req, res) => {
    const projectId = req.params.id;
    const { title, author } = req.body; // Extend with any additional metadata fields if needed.
    const gamesJsonPath = path.join(__dirname, "public", "games.json");

    let games = [];
    try {
        games = JSON.parse(fs.readFileSync(gamesJsonPath, "utf8"));
    } catch (err) {
        return res.status(500).json({ error: "Error reading games.json" });
    }

    const gameIndex = games.findIndex(game => game.id === projectId);
    if (gameIndex === -1) {
        return res.status(404).json({ error: "Game not found" });
    }

    // Update the metadata
    if (title) games[gameIndex].title = title;
    if (author) games[gameIndex].author = author;
    // Add further fields as needed

    fs.writeFile(gamesJsonPath, JSON.stringify(games, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: "Error updating games.json" });
        }
        res.json({ success: true, game: games[gameIndex] });
    });
});

app.delete("/games/:id", (req, res) => {
    const projectId = req.params.id;
    const extractDir = path.join(__dirname, "public", "builds", projectId);
    const gamesJsonPath = path.join(__dirname, "public", "games.json");

    // Remove the project folder (if it exists)
    if (fs.existsSync(extractDir)) {
        try {
            fs.rmSync(extractDir, { recursive: true, force: true });
        } catch (err) {
            console.error("Error deleting project folder:", err);
            return res.status(500).json({ error: "Error deleting project folder." });
        }
    }

    // Update games.json: filter out the deleted game
    let games = [];
    try {
        games = JSON.parse(fs.readFileSync(gamesJsonPath, "utf8"));
    } catch (err) {
        return res.status(500).json({ error: "Error reading games.json" });
    }

    const newGames = games.filter(game => game.id !== projectId);
    fs.writeFile(gamesJsonPath, JSON.stringify(newGames, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: "Error updating games.json" });
        }
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
