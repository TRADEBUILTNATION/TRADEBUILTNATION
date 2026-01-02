# TRADE BUILT

Starter static site for the **TRADE BUILT** learning platform.

## Logo
Drop your logo into `assets/` named **TRADEBUILT**.

Recommended: `assets/TRADEBUILT.svg`

Also supported: `assets/TRADEBUILT.png` or `assets/TRADEBUILT.webp`

## Run
Just open `index.html` in your browser.

If you want a local server (recommended for future routing):

- PowerShell:
  - `python -m http.server 5173`
  - then open `http://localhost:5173`

## 3D Models
The 3D Models page (`3d-models.html`) reads a manifest at `assets/models.json`.

Whenever you add/remove `.glb` / `.gltf` files in `assets/3D Models/`, regenerate the manifest:

- PowerShell:
  - `.\tools\generate-models-manifest.ps1`