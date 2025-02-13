// server.js
const express = require("express");
const axios = require("axios");
const multer = require("multer");
const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const cors = require("cors");

// Helper function: decompress a file
const decompressFile = (filePath, extension) => {
    return new Promise((resolve, reject) => {
        // Remove the extension (.gz or .br) from the filename to get the target name.
        const newFilePath = filePath.replace(extension, "");
        const readStream = fs.createReadStream(filePath);
        const writeStream = fs.createWriteStream(newFilePath);
        // Choose the correct decompression stream based on the extension.
        const decompress =
            extension === ".gz"
                ? zlib.createGunzip()
                : zlib.createBrotliDecompress();

        readStream
            .pipe(decompress)
            .pipe(writeStream)
            .on("finish", () => {
                fs.unlinkSync(filePath);
                resolve(newFilePath);
            })
            .on("error", reject);
    });
};

// Helper function: decompress all files in a folder
const decompressFilesInFolder = (folderPath) => {
    return new Promise((resolve, reject) => {
        fs.readdir(folderPath, (err, files) => {
            if (err) return reject(err);
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

// Helper function: recursively find the "Build" folder
function findBuildFolder(dir) {
    const items = fs.readdirSync(dir);
    if (items.includes("Build")) {
        const potential = path.join(dir, "Build");
        if (fs.statSync(potential).isDirectory()) {
            return potential;
        }
    }
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            const found = findBuildFolder(fullPath);
            if (found) return found;
        }
    }
    return null;
}

// Helper function: rename build files in a folder
const renameBuildFiles = (buildFolder, projectId, currentBaseName) => {
    const extensions = [".loader.js", ".data", ".framework.js", ".wasm"];
    extensions.forEach((ext) => {
        const oldFilePath = path.join(buildFolder, `${currentBaseName}${ext}`);
        const newFilePath = path.join(buildFolder, `${projectId}${ext}`);
        if (fs.existsSync(oldFilePath)) {
            fs.renameSync(oldFilePath, newFilePath);
        }
    });
};

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());

app.use(
    "/builds",
    express.static(path.join(__dirname, "public", "builds"), {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith("thumbnail.png")) {
                res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            }
        },
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy route for GitHub assets
app.get("/proxy/github/:owner/:repo/:tag/:assetName?", async (req, res) => {
    const { owner, repo, tag, assetName } = req.params;
    let assetUrl = "";
    if (assetName && assetName.trim() !== "") {
        try {
            // Fetch release data for the specified tag.
            const releaseResponse = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`
            );
            const releaseData = releaseResponse.data;
            // Find the asset that matches the provided asset name.
            const asset = releaseData.assets.find((a) => a.name === assetName.trim());
            if (!asset) {
                return res.status(404).json({ error: "Asset not found in the release." });
            }
            assetUrl = asset.browser_download_url;
        } catch (error) {
            console.error("Error fetching release data:", error.message);
            return res.status(500).json({ error: "Error fetching release data from GitHub." });
        }
    } else {
        const fileName = `${repo}-${tag}.zip`;
        assetUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}/${fileName}`;
    }

    try {
        const response = await axios({
            url: assetUrl,
            method: "GET",
            responseType: "stream",
        });
        const downloadFileName =
            assetName && assetName.trim() !== ""
                ? assetName.trim()
                : `${repo}-${tag}.zip`;
        res.setHeader("Content-Disposition", `attachment; filename=${downloadFileName}`);
        res.setHeader("Content-Type", "application/zip");
        response.data.pipe(res);
    } catch (error) {
        console.error("Error fetching GitHub asset:", error.message);
        res.status(500).json({ error: "Failed to fetch GitHub asset." });
    }
});

// Upload endpoint
app.post(
    "/upload",
    upload.fields([
        { name: "zipfile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    (req, res) => {
        const { title, author, projectId, overwrite, moduleCode } = req.body;
        const zipFile = req.files["zipfile"] ? req.files["zipfile"][0] : null;
        const thumbnailFile = req.files["thumbnail"]
            ? req.files["thumbnail"][0]
            : null;

        if (!zipFile || !title || !author || !projectId) {
            return res.status(400).json({ error: "Missing required fields or files." });
        }

        const extractDir = path.join(__dirname, "public", "builds", projectId);
        const gamesJsonPath = path.join(__dirname, "public", "games.json");

        let games = [];
        try {
            games = JSON.parse(fs.readFileSync(gamesJsonPath, "utf8"));
        } catch (err) {
            games = [];
        }

        const folderExists = fs.existsSync(extractDir);
        const gameIndex = games.findIndex((game) => game.id === projectId);

        if ((folderExists || gameIndex !== -1) && overwrite !== "true") {
            return res.status(400).json({
                error:
                    "A game with that project ID already exists. Set overwrite=true to replace it.",
            });
        }

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

        fs.mkdirSync(extractDir, { recursive: true });

        // Process thumbnail if provided.
        if (thumbnailFile) {
            const thumbDest = path.join(extractDir, "thumbnail.png");
            try {
                fs.renameSync(thumbnailFile.path, thumbDest);
            } catch (err) {
                console.error("Error moving thumbnail file:", err);
                return res.status(500).json({ error: "Error processing thumbnail." });
            }
        }

        // Extract the ZIP file.
        fs.createReadStream(zipFile.path)
            .pipe(unzipper.Extract({ path: extractDir }))
            .on("close", () => {
                let foundBuildFolder = findBuildFolder(extractDir);
                if (!foundBuildFolder) {
                    return res.status(500).json({ error: "Build folder not found in the uploaded ZIP." });
                }
                const targetBuildFolder = path.join(extractDir, "Build");
                if (foundBuildFolder !== targetBuildFolder) {
                    try {
                        fs.renameSync(foundBuildFolder, targetBuildFolder);
                    } catch (err) {
                        return res.status(500).json({ error: "Error relocating Build folder." });
                    }
                }

                // Determine current base name from the loader file.
                const buildFiles = fs.readdirSync(targetBuildFolder);
                const loaderFile = buildFiles.find((file) => file.endsWith(".loader.js"));
                if (!loaderFile) {
                    return res.status(500).json({ error: "Loader file not found in Build folder." });
                }
                const currentBaseName = loaderFile.replace(".loader.js", "");

                // Rename build files if necessary.
                if (currentBaseName !== projectId) {
                    renameBuildFiles(targetBuildFolder, projectId, currentBaseName);
                }

                // Decompress any compressed files in the Build folder.
                decompressFilesInFolder(targetBuildFolder)
                    .then(() => {
                        const newGame = {
                            id: projectId,
                            title,
                            author,
                            moduleCode: moduleCode || "", // Will store an empty string if not provided
                            uploadDate: new Date().toISOString(),
                            thumbnail: `/builds/${projectId}/thumbnail.png`,
                            build: {
                                loaderUrl: `/builds/${projectId}/Build/${projectId}.loader.js`,
                                dataUrl: `/builds/${projectId}/Build/${projectId}.data`,
                                frameworkUrl: `/builds/${projectId}/Build/${projectId}.framework.js`,
                                codeUrl: `/builds/${projectId}/Build/${projectId}.wasm`,
                            },
                        };

                        games.push(newGame);

                        fs.writeFile(gamesJsonPath, JSON.stringify(games, null, 2), (err) => {
                            if (err) {
                                return res.status(500).json({ error: "Error updating games.json" });
                            }
                            fs.unlink(zipFile.path, () => { });
                            res.json({ success: true, game: newGame });
                        });
                    })
                    .catch((err) => {
                        res.status(500).json({ error: "Error decompressing build files" });
                    });
            })
            .on("error", (err) => {
                res.status(500).json({ error: "Error extracting zip file", details: err.message });
            });
    }
);

// Update game metadata endpoint.
app.put("/games/:id", (req, res) => {
    const projectId = req.params.id;
    const { title, author, moduleCode, uploadDate } = req.body;
    const gamesJsonPath = path.join(__dirname, "public", "games.json");

    let games = [];
    try {
        games = JSON.parse(fs.readFileSync(gamesJsonPath, "utf8"));
    } catch (err) {
        return res.status(500).json({ error: "Error reading games.json" });
    }

    const gameIndex = games.findIndex((game) => game.id === projectId);
    if (gameIndex === -1) {
        return res.status(404).json({ error: "Game not found" });
    }

    if (title) games[gameIndex].title = title;
    if (author) games[gameIndex].author = author;
    if (moduleCode !== undefined) games[gameIndex].moduleCode = moduleCode;
    if (uploadDate) games[gameIndex].uploadDate = uploadDate;

    fs.writeFile(gamesJsonPath, JSON.stringify(games, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: "Error updating games.json" });
        }
        res.json({ success: true, game: games[gameIndex] });
    });
});

// Update thumbnail endpoint.
app.put("/games/:id/thumbnail", upload.single("thumbnail"), (req, res) => {
    const projectId = req.params.id;
    const thumbnailFile = req.file;
    if (!thumbnailFile) {
        return res.status(400).json({ error: "No thumbnail file provided." });
    }
    const thumbDest = path.join(__dirname, "public", "builds", projectId, "thumbnail.png");
    try {
        fs.renameSync(thumbnailFile.path, thumbDest);
    } catch (err) {
        console.error("Error moving thumbnail file:", err);
        return res.status(500).json({ error: "Error processing thumbnail." });
    }
    res.json({ success: true, thumbnail: `/builds/${projectId}/thumbnail.png` });
});

// Delete game endpoint.
app.delete("/games/:id", (req, res) => {
    const projectId = req.params.id;
    const extractDir = path.join(__dirname, "public", "builds", projectId);
    const gamesJsonPath = path.join(__dirname, "public", "games.json");

    if (fs.existsSync(extractDir)) {
        try {
            fs.rmSync(extractDir, { recursive: true, force: true });
        } catch (err) {
            console.error("Error deleting project folder:", err);
            return res.status(500).json({ error: "Error deleting project folder." });
        }
    }

    let games = [];
    try {
        games = JSON.parse(fs.readFileSync(gamesJsonPath, "utf8"));
    } catch (err) {
        return res.status(500).json({ error: "Error reading games.json" });
    }

    const newGames = games.filter((game) => game.id !== projectId);
    fs.writeFile(gamesJsonPath, JSON.stringify(newGames, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: "Error updating games.json" });
        }
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
