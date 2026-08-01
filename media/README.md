# Homepage video assets

The redesigned homepage expects these two replaceable files:

- `home-opening-bg.mp4` — muted autoplay background, 540×960, 30 fps
- `home-opening-full.mp4` — full version opened by the sound button, 720×1280, 30 fps

Replace `home-opening-full.mp4` with the narrated export later while keeping the same filename. The HTML uses `preload="none"` for the full version so it downloads only after a click.
