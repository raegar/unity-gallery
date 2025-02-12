// src/UnityGame.js
import React, { useEffect } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

function UnityGame({ build }) {
  // Include 'unload' from useUnityContext so we can call it in cleanup.
  const {
    unityProvider,
    isLoaded,
    loadingProgression,
    unload, // <-- key addition
  } = useUnityContext({
    loaderUrl: build.loaderUrl,
    dataUrl: build.dataUrl,
    frameworkUrl: build.frameworkUrl,
    codeUrl: build.codeUrl,
  });

  // On unmount, call unload() to fully stop the Unity instance
  useEffect(() => {
    return () => {
      console.log("[UnityGame] Unmounting - unloading Unity instance...");
      unload()
        .then(() => console.log("[UnityGame] Unity instance unloaded."))
        .catch((error) => console.error("[UnityGame] Error unloading Unity:", error));
    };
  }, [unload]);

  // Calculate loading percentage (if desired)
  const loadingPercentage = Math.round(loadingProgression * 100);

  return (
    <div style={{ position: "relative", width: 800, height: 600 }}>
      {!isLoaded && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          Loading... ({loadingPercentage}%)
        </div>
      )}
      <Unity unityProvider={unityProvider} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default UnityGame;
