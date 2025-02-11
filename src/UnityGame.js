// src/UnityGame.js
import React from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

function UnityGame({ build }) {
  // Call the hook with the build configuration provided via props.
  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl: build.loaderUrl,
    dataUrl: build.dataUrl,
    frameworkUrl: build.frameworkUrl,
    codeUrl: build.codeUrl,
  });

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
