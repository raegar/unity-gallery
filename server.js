// server.js
const express = require("express");
const axios = require('axios');
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

function findBuildFolder(dir) {
    const items = fs.readdirSync(dir);
    // Check if any of the items is named "Build" and is a directory
    if (items.includes("Build")) {
        const potential = path.join(dir, "Build");
        if (fs.statSync(potential).isDirectory()) {
            return potential;
        }
    }
    // Recursively search in subdirectories
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            const found = findBuildFolder(fullPath);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

const app = express();

// Configure multer to handle multiple fields
const upload = multer({ dest: "uploads/" });

const cors = require('cors');
app.use(cors());


// Serve static files from the builds folder with cache-control headers for thumbnails.
app.use('/builds', express.static(path.join(__dirname, 'public', 'builds'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('thumbnail.png')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

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
            // Find the Build folder recursively in the extracted directory
            let foundBuildFolder = findBuildFolder(extractDir);
            if (!foundBuildFolder) {
                return res.status(500).json({ error: "Build folder not found in the uploaded ZIP." });
            }

            const targetBuildFolder = path.join(extractDir, "Build");

            // If the found Build folder isn't already at the target, move it there.
            if (foundBuildFolder !== targetBuildFolder) {
                try {
                    fs.renameSync(foundBuildFolder, targetBuildFolder);
                    console.log("Moved Build folder to target location:", targetBuildFolder);
                } catch (err) {
                    console.error("Error moving Build folder:", err);
                    return res.status(500).json({ error: "Error relocating Build folder." });
                }
            }

            // Now targetBuildFolder is the Build folder to use.
            // Decompress any compressed files in the Build folder.
            decompressFilesInFolder(targetBuildFolder)
                .then(() => {
                    // All compressed files have been decompressed.
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
                        // Remove the uploaded ZIP file after extraction.
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

app.put("/games/:id/thumbnail", upload.single("thumbnail"), (req, res) => {
    const projectId = req.params.id;
    const thumbnailFile = req.file;
    if (!thumbnailFile) {
        return res.status(400).json({ error: "No thumbnail file provided." });
    }
    // Define the destination for the new thumbnail.
    const thumbDest = path.join(__dirname, "public", "builds", projectId, "thumbnail.png");

    try {
        // Replace the existing thumbnail (if any) by moving the new file.
        fs.renameSync(thumbnailFile.path, thumbDest);
    } catch (err) {
        console.error("Error moving thumbnail file:", err);
        return res.status(500).json({ error: "Error processing thumbnail." });
    }

    // Optionally, you could update games.json here if you wanted to store a timestamp
    // or other metadata. For our purposes, the thumbnail URL is fixed.
    res.json({ success: true, thumbnail: `/builds/${projectId}/thumbnail.png` });
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


// Proxy route to fetch GitHub release asset
app.get('/proxy/github/:owner/:repo/latest', async (req, res) => {
    const { owner, repo } = req.params;
    try {
        // First, get the latest release info from GitHub API
        const releaseResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
        const releaseData = releaseResponse.data;
        const tag = releaseData.tag_name; // e.g. "v0.0.1"

        // Construct the asset URL using the tag from the release info.
        // Note: This assumes your asset is named in the format: `${repo}-${tag}.zip`
        // Adjust if your naming convention differs.
        const assetUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}/${repo}-${tag}.zip`;

        // Fetch the asset from GitHub
        const assetResponse = await axios({
            url: assetUrl,
            method: 'GET',
            responseType: 'stream',
        });

        // Set headers and pipe the response
        res.setHeader('Content-Disposition', `attachment; filename=${repo}-${tag}.zip`);
        res.setHeader('Content-Type', 'application/zip');
        assetResponse.data.pipe(res);
    } catch (error) {
        console.error('Error fetching GitHub asset:', error.message);
        res.status(500).json({ error: 'Failed to fetch GitHub asset.' });
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
