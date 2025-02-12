# Unity Student Game Showcase

## Overview

The Unity Student Game Showcase Web App is a platform designed for showcasing and managing student-developed Unity WebGL games incluuding game uploads, presenting a dynamic gallery of games, and providing powerful filtering and sorting options for end users.

## Installation

To install and run the project locally, follow these steps:

```
git clone https://github.com/raegar/unity-gallery.git
cd unity-gallery
npm install
npm start
```

## Key Features

### Game Upload & Processing
- **Local & GitHub Upload Options:**  
  Users can upload a game ZIP file directly from their PC or provide a GitHub repository URL to fetch the latest release asset via a server-side proxy.
- **Automatic Build File Renaming:**  
  The app renames Unity build files to match the provided Project ID, ensuring that the game loads correctly even if the build’s file naming doesn’t match the user-specified ID.
- **Thumbnail Upload:**  
  Users can upload a custom thumbnail image (recommended at 640×480) for each game.

### Enhanced Metadata
- **Extended Game Information:**  
  Each game entry now includes additional metadata:
  - **Upload Date:** Automatically set at the time of upload (and editable later via a date picker).
  - **Module Code:** An optional field to indicate the university module for which the game was developed.
- **Metadata Editing:**  
  The Edit Game page has been updated to allow users to modify the title, author, thumbnail, module code, and upload date with an intuitive interface.

### Dynamic Gallery Presentation
- **Randomized Order:**  
  On initial load, games in the gallery are displayed in a random order to promote varied game exposure.
- **Filtering & Sorting Options:**  
  Users can filter the gallery using a drop-down list of available module codes and sort games by title, upload date, module code, author, or randomized order.
- **Responsive & Modern UI:**  
  The gallery features a clean, responsive design. Game cards display the thumbnail, title, and author, with an icon overlay in the top right corner of the thumbnail for quick editing.

### Robust Server-Side Handling
- **Robust File Handling:**  
  The Express-based backend uses Multer for file uploads, unzips the uploaded ZIP file, decompresses any compressed build files, and dynamically renames files to ensure consistency with the Project ID.
- **Proxy for GitHub Assets:**  
  A new server-side proxy route fetches game assets from GitHub releases to overcome CORS limitations.
- **CORS & Cache Control:**  
  The server is configured to allow cross-origin requests and serve thumbnail images without caching issues.

---
