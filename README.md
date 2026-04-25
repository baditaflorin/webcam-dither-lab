# Webcam Dither Lab

Live webcam playground for comparing black-and-white and dithering filters side
by side with a draggable split view.

## Features

- Live webcam input in the browser
- Split-view comparison with a draggable divider
- Manual filter lanes for A/B testing
- Auto Best Detail mode that scores candidates and picks the strongest detail-preserving result
- Tone model switching between linear, perceptual `sqrt`, and gamma `2.2`

## Filters

- Auto Best Detail
- Parker 3x3
- White Noise
- Interleaved Gradient Noise
- Bayer 4x4
- Floyd-Steinberg
- Atkinson
- Burkes
- Sierra Lite
- Threshold
- Grayscale
- Original

## Detail Scoring

`Auto Best Detail` evaluates a smaller live frame using the current threshold,
contrast, tone model, noise amount, and seed. It compares candidate filters by
combining:

- tone preservation
- edge preservation

That makes it a practical "which one keeps the most visible structure?" mode
instead of just picking the most contrasty output.

## Local Run

Serve the folder and open `index.html` in a browser. One simple option is:

```bash
python3 -m http.server 8000
```

Then visit `http://127.0.0.1:8000/index.html`.

## Main Reusable Functions

```js
const filtered = applyNoiseDitherFilter(imageData, {
  threshold: 128,
  noiseAmount: 42,
  contrast: 1.15,
  seed: 137,
  toneCurve: "perceptual",
});
```

```js
const best = findBestDetailFilter(imageData, {
  threshold: 128,
  noiseAmount: 42,
  contrast: 1.15,
  seed: 137,
  toneCurve: "perceptual",
});
```
