const startCameraButton = document.getElementById("startCamera");
const stopCameraButton = document.getElementById("stopCamera");
const cameraStatus = document.getElementById("cameraStatus");
const sourceVideo = document.getElementById("sourceVideo");
const comparisonCanvas = document.getElementById("comparisonCanvas");
const frameCanvas = document.getElementById("frameCanvas");
const leftCanvas = document.getElementById("leftCanvas");
const rightCanvas = document.getElementById("rightCanvas");
const comparisonStage = document.getElementById("comparisonStage");
const splitHandle = document.getElementById("splitHandle");
const splitSlider = document.getElementById("splitSlider");
const leftFilterLabel = document.getElementById("leftFilterLabel");
const rightFilterLabel = document.getElementById("rightFilterLabel");

const THRESHOLD_MODES = new Set([
  "autoDetail",
  "threshold",
  "noiseDither",
  "ignDither",
  "parker3",
  "bayer4",
  "floydSteinberg",
  "atkinson",
  "burkes",
  "sierraLite",
]);
const NOISE_MODES = new Set(["autoDetail", "noiseDither", "ignDither"]);
const AUTO_DETAIL_CANDIDATES = [
  "parker3",
  "bayer4",
  "noiseDither",
  "ignDither",
  "floydSteinberg",
  "atkinson",
  "burkes",
  "sierraLite",
  "threshold",
];
const AUTO_EVAL_INTERVAL_MS = 900;
const AUTO_EVAL_MAX_WIDTH = 160;
const AUTO_EVAL_MAX_HEIGHT = 90;
const AUTO_DETAIL_FALLBACK_MODE = "burkes";

const PARKER_3X3_MATRIX = [
  [7, 0, 5],
  [2, 4, 6],
  [3, 8, 1],
];
const BAYER_4X4_MATRIX = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const ERROR_DIFFUSION_FILTERS = {
  floydSteinberg: {
    divisor: 16,
    offsets: [
      [1, 0, 7],
      [-1, 1, 3],
      [0, 1, 5],
      [1, 1, 1],
    ],
  },
  atkinson: {
    divisor: 8,
    offsets: [
      [1, 0, 1],
      [2, 0, 1],
      [-1, 1, 1],
      [0, 1, 1],
      [1, 1, 1],
      [0, 2, 1],
    ],
  },
  burkes: {
    divisor: 32,
    offsets: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
    ],
  },
  sierraLite: {
    divisor: 4,
    offsets: [
      [1, 0, 2],
      [-1, 1, 1],
      [0, 1, 1],
    ],
  },
};

const filterElements = {
  left: getFilterElements("left"),
  right: getFilterElements("right"),
};

const comparisonContext = comparisonCanvas.getContext("2d");
const frameContext = frameCanvas.getContext("2d", { willReadFrequently: true });
const leftContext = leftCanvas.getContext("2d");
const rightContext = rightCanvas.getContext("2d");

const state = {
  stream: null,
  animationFrameId: null,
  isDraggingSplit: false,
  splitRatio: 0.5,
  autoSelection: {
    left: createEmptyAutoSelection(),
    right: createEmptyAutoSelection(),
  },
};

initialize();

function initialize() {
  setupFilterControls("left");
  setupFilterControls("right");
  setupSplitControls();
  drawIdleState();
  updateFilterLabels();
  updateAutoNote("left");
  updateAutoNote("right");

  startCameraButton.addEventListener("click", startCamera);
  stopCameraButton.addEventListener("click", stopCamera);
  window.addEventListener("beforeunload", stopCamera);

  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("This browser does not support webcam access.");
    startCameraButton.disabled = true;
  }
}

function createEmptyAutoSelection() {
  return {
    mode: "",
    score: 0,
    toneScore: 0,
    edgeScore: 0,
    optionKey: "",
    updatedAt: 0,
  };
}

function getFilterElements(side) {
  return {
    type: document.getElementById(`${side}FilterType`),
    toneCurve: document.getElementById(`${side}ToneCurve`),
    autoNote: document.getElementById(`${side}AutoNote`),
    threshold: document.getElementById(`${side}Threshold`),
    noiseAmount: document.getElementById(`${side}NoiseAmount`),
    contrast: document.getElementById(`${side}Contrast`),
    seed: document.getElementById(`${side}Seed`),
    outputs: {
      threshold: document.getElementById(`${side}ThresholdValue`),
      noiseAmount: document.getElementById(`${side}NoiseAmountValue`),
      contrast: document.getElementById(`${side}ContrastValue`),
      seed: document.getElementById(`${side}SeedValue`),
    },
  };
}

function setupFilterControls(side) {
  const elements = filterElements[side];

  elements.type.addEventListener("change", () => {
    resetAutoSelection(side);
    syncControlStates(side);
    updateFilterLabels();
    updateAutoNote(side);
  });

  elements.toneCurve.addEventListener("change", () => {
    resetAutoSelection(side);
    updateFilterLabels();
    updateAutoNote(side);
  });

  ["threshold", "noiseAmount", "contrast", "seed"].forEach((key) => {
    elements[key].addEventListener("input", () => {
      elements.outputs[key].value = elements[key].value;
      resetAutoSelection(side);
      updateAutoNote(side);
    });
    elements.outputs[key].value = elements[key].value;
  });

  syncControlStates(side);
}

function resetAutoSelection(side) {
  state.autoSelection[side] = createEmptyAutoSelection();
}

function syncControlStates(side) {
  const elements = filterElements[side];
  const mode = elements.type.value;
  const needsThreshold = THRESHOLD_MODES.has(mode);
  const needsNoise = NOISE_MODES.has(mode);
  const needsContrast = mode !== "original";
  const needsToneCurve = mode !== "original";

  toggleControl(elements.threshold, needsThreshold);
  toggleControl(elements.noiseAmount, needsNoise);
  toggleControl(elements.seed, needsNoise);
  toggleControl(elements.contrast, needsContrast);
  toggleControl(elements.toneCurve, needsToneCurve);
}

function toggleControl(element, enabled) {
  const wrapper = element.closest(".control");
  element.disabled = !enabled;
  wrapper.classList.toggle("is-disabled", !enabled);
}

function setupSplitControls() {
  setSplit(Number(splitSlider.value) / 100);

  splitSlider.addEventListener("input", () => {
    setSplit(Number(splitSlider.value) / 100);
  });

  comparisonStage.addEventListener("pointerdown", (event) => {
    state.isDraggingSplit = true;
    comparisonStage.setPointerCapture(event.pointerId);
    updateSplitFromPointer(event);
  });

  comparisonStage.addEventListener("pointermove", (event) => {
    if (!state.isDraggingSplit) {
      return;
    }
    updateSplitFromPointer(event);
  });

  comparisonStage.addEventListener("pointerup", (event) => {
    state.isDraggingSplit = false;
    comparisonStage.releasePointerCapture(event.pointerId);
  });

  comparisonStage.addEventListener("pointerleave", () => {
    state.isDraggingSplit = false;
  });

  splitHandle.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      setSplit(state.splitRatio - 0.02);
      event.preventDefault();
    }

    if (event.key === "ArrowRight") {
      setSplit(state.splitRatio + 0.02);
      event.preventDefault();
    }
  });
}

function updateSplitFromPointer(event) {
  const rect = comparisonStage.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  setSplit(ratio);
}

function setSplit(ratio) {
  state.splitRatio = clamp(ratio, 0.1, 0.9);
  comparisonStage.style.setProperty(
    "--split-pos",
    `${(state.splitRatio * 100).toFixed(2)}%`
  );
  splitSlider.value = Math.round(state.splitRatio * 100);
}

async function startCamera() {
  if (state.stream) {
    return;
  }

  try {
    setStatus("Requesting camera access...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    state.stream = stream;
    sourceVideo.srcObject = stream;
    await sourceVideo.play();

    resizeCanvasesToVideo();
    startCameraButton.disabled = true;
    stopCameraButton.disabled = false;
    setStatus("Camera live. Drag the divider to compare both filters.");
    startRenderLoop();
  } catch (error) {
    setStatus(`Camera access failed: ${error.message}`);
  }
}

function stopCamera() {
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }

  sourceVideo.srcObject = null;
  startCameraButton.disabled = false;
  stopCameraButton.disabled = true;
  setStatus("Camera stopped. Press Start camera to resume.");
  drawIdleState();
}

function resizeCanvasesToVideo() {
  const videoWidth = sourceVideo.videoWidth || 640;
  const videoHeight = sourceVideo.videoHeight || 360;
  const maxWidth = 640;
  const maxHeight = 360;
  const scale = Math.min(maxWidth / videoWidth, maxHeight / videoHeight, 1);
  const width = Math.max(320, Math.round(videoWidth * scale));
  const height = Math.max(180, Math.round(videoHeight * scale));

  [comparisonCanvas, frameCanvas, leftCanvas, rightCanvas].forEach((canvas) => {
    canvas.width = width;
    canvas.height = height;
  });
}

function startRenderLoop() {
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
  }

  const render = (timestamp = performance.now()) => {
    if (!state.stream || sourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      state.animationFrameId = requestAnimationFrame(render);
      return;
    }

    frameContext.drawImage(sourceVideo, 0, 0, frameCanvas.width, frameCanvas.height);
    const frame = frameContext.getImageData(0, 0, frameCanvas.width, frameCanvas.height);

    const leftOptions = resolveFilterOptions("left", frame, timestamp);
    const rightOptions = resolveFilterOptions("right", frame, timestamp);

    const leftImage = applySelectedFilter(frame, leftOptions);
    const rightImage = applySelectedFilter(frame, rightOptions);

    leftContext.putImageData(leftImage, 0, 0);
    rightContext.putImageData(rightImage, 0, 0);
    drawSplitComparison();

    state.animationFrameId = requestAnimationFrame(render);
  };

  render();
}

function resolveFilterOptions(side, frame, timestamp) {
  const options = getFilterOptions(side);

  if (options.mode !== "autoDetail") {
    return options;
  }

  return resolveAutoDetailMode(side, frame, options, timestamp);
}

function resolveAutoDetailMode(side, frame, options, timestamp) {
  const selection = state.autoSelection[side];
  const optionKey = buildAutoOptionKey(frame, options);
  const needsEvaluation =
    !selection.mode ||
    selection.optionKey !== optionKey ||
    timestamp - selection.updatedAt >= AUTO_EVAL_INTERVAL_MS;

  if (needsEvaluation) {
    const evaluationFrame = resizeImageDataNearest(
      frame,
      AUTO_EVAL_MAX_WIDTH,
      AUTO_EVAL_MAX_HEIGHT
    );
    const result = findBestDetailFilter(evaluationFrame, options);

    state.autoSelection[side] = {
      mode: result.mode,
      score: result.score,
      toneScore: result.toneScore,
      edgeScore: result.edgeScore,
      optionKey,
      updatedAt: timestamp,
    };

    updateFilterLabels();
    updateAutoNote(side);
  }

  return {
    ...options,
    mode: state.autoSelection[side].mode || AUTO_DETAIL_FALLBACK_MODE,
  };
}

function buildAutoOptionKey(frame, options) {
  return [
    frame.width,
    frame.height,
    options.threshold,
    options.noiseAmount,
    options.contrast,
    options.seed,
    options.toneCurve,
  ].join("|");
}

function drawSplitComparison() {
  const width = comparisonCanvas.width;
  const height = comparisonCanvas.height;
  const splitX = Math.floor(width * state.splitRatio);

  comparisonContext.clearRect(0, 0, width, height);
  comparisonContext.drawImage(leftCanvas, 0, 0, splitX, height, 0, 0, splitX, height);
  comparisonContext.drawImage(
    rightCanvas,
    splitX,
    0,
    width - splitX,
    height,
    splitX,
    0,
    width - splitX,
    height
  );
}

function drawIdleState() {
  const width = comparisonCanvas.width;
  const height = comparisonCanvas.height;
  const gradient = comparisonContext.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#142f43");
  gradient.addColorStop(0.5, "#d6572f");
  gradient.addColorStop(1, "#f8e5cc");

  comparisonContext.fillStyle = gradient;
  comparisonContext.fillRect(0, 0, width, height);

  const glow = comparisonContext.createRadialGradient(
    width * 0.7,
    height * 0.3,
    10,
    width * 0.7,
    height * 0.3,
    width * 0.4
  );
  glow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  comparisonContext.fillStyle = glow;
  comparisonContext.fillRect(0, 0, width, height);

  comparisonContext.fillStyle = "rgba(20, 20, 20, 0.9)";
  comparisonContext.fillRect(0, height * 0.58, width, height * 0.42);

  comparisonContext.fillStyle = "#fff4e5";
  comparisonContext.font = "700 32px 'Space Grotesk', sans-serif";
  comparisonContext.fillText("Start camera", 32, 48);
  comparisonContext.font = "500 18px 'IBM Plex Mono', monospace";
  comparisonContext.fillText("then drag the divider to compare A vs B", 32, 78);
}

function updateFilterLabels() {
  leftFilterLabel.textContent = buildFilterLabel("A", "left");
  rightFilterLabel.textContent = buildFilterLabel("B", "right");
}

function buildFilterLabel(prefix, side) {
  const elements = filterElements[side];
  const mode = elements.type.value;

  if (mode === "autoDetail") {
    const auto = state.autoSelection[side];
    if (!auto.mode) {
      return `${prefix} · Auto Detail`;
    }
    return `${prefix} · Auto: ${getModeLabel(auto.mode)}`;
  }

  if (mode === "original") {
    return `${prefix} · ${getModeLabel(mode)}`;
  }

  return `${prefix} · ${getModeLabel(mode)} · ${getToneLabel(elements.toneCurve.value)}`;
}

function updateAutoNote(side) {
  const elements = filterElements[side];
  const mode = elements.type.value;
  const auto = state.autoSelection[side];

  if (mode !== "autoDetail") {
    elements.autoNote.textContent =
      "Manual mode. Switch to Auto Best Detail to let the app score filters.";
    return;
  }

  if (!auto.mode) {
    elements.autoNote.textContent =
      "Auto detail is analyzing the current frame and comparing filter candidates.";
    return;
  }

  elements.autoNote.textContent =
    `Best right now: ${getModeLabel(auto.mode)} · detail ${(auto.score * 100).toFixed(1)}%` +
    ` · edges ${(auto.edgeScore * 100).toFixed(1)}% · tone ${(auto.toneScore * 100).toFixed(1)}%`;
}

function getModeLabel(mode) {
  switch (mode) {
    case "autoDetail":
      return "Auto Detail";
    case "parker3":
      return "Parker 3x3";
    case "noiseDither":
      return "White Noise";
    case "ignDither":
      return "IGN";
    case "bayer4":
      return "Bayer 4x4";
    case "floydSteinberg":
      return "Floyd-Steinberg";
    case "atkinson":
      return "Atkinson";
    case "burkes":
      return "Burkes";
    case "sierraLite":
      return "Sierra Lite";
    case "threshold":
      return "Threshold";
    case "grayscale":
      return "Grayscale";
    case "original":
      return "Original";
    default:
      return mode;
  }
}

function getToneLabel(toneCurve) {
  switch (toneCurve) {
    case "perceptual":
      return "Sqrt";
    case "gamma":
      return "Gamma";
    case "linear":
    default:
      return "Linear";
  }
}

function getFilterOptions(side) {
  const elements = filterElements[side];

  return {
    mode: elements.type.value,
    toneCurve: elements.toneCurve.value,
    threshold: Number(elements.threshold.value),
    noiseAmount: Number(elements.noiseAmount.value),
    contrast: Number(elements.contrast.value),
    seed: Number(elements.seed.value),
  };
}

function applySelectedFilter(imageData, options) {
  switch (options.mode) {
    case "parker3":
      return applyOrderedDitherFilter(imageData, options, PARKER_3X3_MATRIX);
    case "bayer4":
      return applyOrderedDitherFilter(imageData, options, BAYER_4X4_MATRIX);
    case "ignDither":
      return applyInterleavedGradientNoiseFilter(imageData, options);
    case "floydSteinberg":
      return applyErrorDiffusionFilter(imageData, options, ERROR_DIFFUSION_FILTERS.floydSteinberg);
    case "atkinson":
      return applyErrorDiffusionFilter(imageData, options, ERROR_DIFFUSION_FILTERS.atkinson);
    case "burkes":
      return applyErrorDiffusionFilter(imageData, options, ERROR_DIFFUSION_FILTERS.burkes);
    case "sierraLite":
      return applyErrorDiffusionFilter(imageData, options, ERROR_DIFFUSION_FILTERS.sierraLite);
    case "threshold":
      return applyThresholdFilter(imageData, options);
    case "grayscale":
      return applyGrayscaleFilter(imageData, options);
    case "original":
      return cloneImageData(imageData);
    case "autoDetail":
      return applyErrorDiffusionFilter(
        imageData,
        { ...options, mode: AUTO_DETAIL_FALLBACK_MODE },
        ERROR_DIFFUSION_FILTERS.burkes
      );
    case "noiseDither":
    default:
      return applyNoiseDitherFilter(imageData, options);
  }
}

function applyNoiseDitherFilter(imageData, options = {}) {
  const {
    threshold = 128,
    noiseAmount = 42,
    contrast = 1,
    seed = 0,
    toneCurve = "linear",
  } = options;

  const source = imageData.data;
  const output = new ImageData(imageData.width, imageData.height);
  const destination = output.data;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      const contrasted = getToneAdjustedLevel(
        source[index],
        source[index + 1],
        source[index + 2],
        contrast,
        toneCurve
      );
      const noiseOffset = (hashNoise(x, y, seed) - 0.5) * noiseAmount * 2;
      const value = contrasted + noiseOffset >= threshold ? 255 : 0;

      destination[index] = value;
      destination[index + 1] = value;
      destination[index + 2] = value;
      destination[index + 3] = source[index + 3];
    }
  }

  return output;
}

function applyInterleavedGradientNoiseFilter(imageData, options = {}) {
  const {
    threshold = 128,
    noiseAmount = 42,
    contrast = 1,
    seed = 0,
    toneCurve = "linear",
  } = options;

  const source = imageData.data;
  const output = new ImageData(imageData.width, imageData.height);
  const destination = output.data;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      const contrasted = getToneAdjustedLevel(
        source[index],
        source[index + 1],
        source[index + 2],
        contrast,
        toneCurve
      );
      const noiseOffset =
        (interleavedGradientNoise(x, y, seed) - 0.5) * noiseAmount * 2;
      const value = contrasted + noiseOffset >= threshold ? 255 : 0;

      destination[index] = value;
      destination[index + 1] = value;
      destination[index + 2] = value;
      destination[index + 3] = source[index + 3];
    }
  }

  return output;
}

function applyOrderedDitherFilter(imageData, options = {}, matrix) {
  const { threshold = 128, contrast = 1, toneCurve = "linear" } = options;
  const source = imageData.data;
  const output = new ImageData(imageData.width, imageData.height);
  const destination = output.data;
  const matrixHeight = matrix.length;
  const matrixWidth = matrix[0].length;
  const matrixArea = matrixWidth * matrixHeight;
  const thresholdOffset = threshold - 128;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      const localThreshold =
        ((matrix[y % matrixHeight][x % matrixWidth] + 0.5) / matrixArea) * 255 +
        thresholdOffset;
      const level = getToneAdjustedLevel(
        source[index],
        source[index + 1],
        source[index + 2],
        contrast,
        toneCurve
      );
      const value = level >= clamp(localThreshold, 0, 255) ? 255 : 0;

      destination[index] = value;
      destination[index + 1] = value;
      destination[index + 2] = value;
      destination[index + 3] = source[index + 3];
    }
  }

  return output;
}

function applyErrorDiffusionFilter(imageData, options = {}, kernel) {
  const { threshold = 128, contrast = 1, toneCurve = "linear" } = options;
  const { width, height } = imageData;
  const source = imageData.data;
  const output = new ImageData(width, height);
  const destination = output.data;
  const grayscale = extractToneLevels(imageData, contrast, toneCurve);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const index = pixelIndex * 4;
      const oldValue = clamp(grayscale[pixelIndex], 0, 255);
      const newValue = oldValue >= threshold ? 255 : 0;
      const error = oldValue - newValue;

      destination[index] = newValue;
      destination[index + 1] = newValue;
      destination[index + 2] = newValue;
      destination[index + 3] = source[index + 3];

      for (const [dx, dy, weight] of kernel.offsets) {
        diffuseError(
          grayscale,
          width,
          height,
          x + dx,
          y + dy,
          (error * weight) / kernel.divisor
        );
      }
    }
  }

  return output;
}

function applyThresholdFilter(imageData, options = {}) {
  const { threshold = 128, contrast = 1, toneCurve = "linear" } = options;
  const source = imageData.data;
  const output = new ImageData(imageData.width, imageData.height);
  const destination = output.data;

  for (let index = 0; index < source.length; index += 4) {
    const value =
      getToneAdjustedLevel(
        source[index],
        source[index + 1],
        source[index + 2],
        contrast,
        toneCurve
      ) >= threshold
        ? 255
        : 0;

    destination[index] = value;
    destination[index + 1] = value;
    destination[index + 2] = value;
    destination[index + 3] = source[index + 3];
  }

  return output;
}

function applyGrayscaleFilter(imageData, options = {}) {
  const { contrast = 1, toneCurve = "linear" } = options;
  const source = imageData.data;
  const output = new ImageData(imageData.width, imageData.height);
  const destination = output.data;

  for (let index = 0; index < source.length; index += 4) {
    const value = getToneAdjustedLevel(
      source[index],
      source[index + 1],
      source[index + 2],
      contrast,
      toneCurve
    );

    destination[index] = value;
    destination[index + 1] = value;
    destination[index + 2] = value;
    destination[index + 3] = source[index + 3];
  }

  return output;
}

function findBestDetailFilter(imageData, options) {
  const sourceLevels = extractToneLevels(imageData, options.contrast, options.toneCurve);
  const sourceBlur = boxBlurLevels(sourceLevels, imageData.width, imageData.height, 2);

  let best = {
    mode: AUTO_DETAIL_FALLBACK_MODE,
    score: -Infinity,
    toneScore: 0,
    edgeScore: 0,
  };

  for (const mode of AUTO_DETAIL_CANDIDATES) {
    const candidateImage = applySelectedFilter(imageData, { ...options, mode });
    const metrics = scoreDetailPreservation(sourceBlur, candidateImage);

    if (metrics.score > best.score) {
      best = {
        mode,
        score: metrics.score,
        toneScore: metrics.toneScore,
        edgeScore: metrics.edgeScore,
      };
    }
  }

  return best;
}

function scoreDetailPreservation(sourceBlur, candidateImage) {
  const { width, height } = candidateImage;
  const candidateLevels = extractImageLevels(candidateImage);
  const candidateBlur = boxBlurLevels(candidateLevels, width, height, 2);

  let toneError = 0;
  let edgeError = 0;
  let toneCount = 0;
  let edgeCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      toneError += Math.abs(sourceBlur[index] - candidateBlur[index]);
      toneCount += 1;

      if (x < width - 1) {
        const sourceDx = Math.abs(sourceBlur[index + 1] - sourceBlur[index]);
        const candidateDx = Math.abs(candidateBlur[index + 1] - candidateBlur[index]);
        edgeError += Math.abs(sourceDx - candidateDx);
        edgeCount += 1;
      }

      if (y < height - 1) {
        const sourceDy = Math.abs(sourceBlur[index + width] - sourceBlur[index]);
        const candidateDy = Math.abs(candidateBlur[index + width] - candidateBlur[index]);
        edgeError += Math.abs(sourceDy - candidateDy);
        edgeCount += 1;
      }
    }
  }

  const toneScore = clamp(1 - toneError / (toneCount * 255), 0, 1);
  const edgeScore = clamp(1 - edgeError / (edgeCount * 255), 0, 1);

  return {
    toneScore,
    edgeScore,
    score: edgeScore * 0.64 + toneScore * 0.36,
  };
}

function extractToneLevels(imageData, contrast, toneCurve) {
  const source = imageData.data;
  const levels = new Float32Array(imageData.width * imageData.height);

  for (let index = 0, pixelIndex = 0; index < source.length; index += 4, pixelIndex += 1) {
    levels[pixelIndex] = getToneAdjustedLevel(
      source[index],
      source[index + 1],
      source[index + 2],
      contrast,
      toneCurve
    );
  }

  return levels;
}

function extractImageLevels(imageData) {
  const source = imageData.data;
  const levels = new Float32Array(imageData.width * imageData.height);

  for (let index = 0, pixelIndex = 0; index < source.length; index += 4, pixelIndex += 1) {
    levels[pixelIndex] = source[index];
  }

  return levels;
}

function boxBlurLevels(levels, width, height, radius) {
  const stride = width + 1;
  const integral = new Float32Array((width + 1) * (height + 1));
  const blurred = new Float32Array(width * height);

  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0;

    for (let x = 1; x <= width; x += 1) {
      rowSum += levels[(y - 1) * width + (x - 1)];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowSum;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius);
      const y0 = Math.max(0, y - radius);
      const x1 = Math.min(width - 1, x + radius);
      const y1 = Math.min(height - 1, y + radius);
      const count = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * stride + (x1 + 1)] -
        integral[y0 * stride + (x1 + 1)] -
        integral[(y1 + 1) * stride + x0] +
        integral[y0 * stride + x0];

      blurred[y * width + x] = sum / count;
    }
  }

  return blurred;
}

function resizeImageDataNearest(imageData, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / imageData.width, maxHeight / imageData.height, 1);
  const width = Math.max(48, Math.round(imageData.width * scale));
  const height = Math.max(48, Math.round(imageData.height * scale));

  if (width === imageData.width && height === imageData.height) {
    return cloneImageData(imageData);
  }

  const source = imageData.data;
  const output = new ImageData(width, height);
  const destination = output.data;

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(
      imageData.height - 1,
      Math.floor((y / height) * imageData.height)
    );

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(
        imageData.width - 1,
        Math.floor((x / width) * imageData.width)
      );
      const sourceIndex = (sourceY * imageData.width + sourceX) * 4;
      const destinationIndex = (y * width + x) * 4;

      destination[destinationIndex] = source[sourceIndex];
      destination[destinationIndex + 1] = source[sourceIndex + 1];
      destination[destinationIndex + 2] = source[sourceIndex + 2];
      destination[destinationIndex + 3] = source[sourceIndex + 3];
    }
  }

  return output;
}

function cloneImageData(imageData) {
  return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
}

function getToneAdjustedLevel(r, g, b, contrast, toneCurve) {
  const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const toned = applyToneCurve(luminance, toneCurve);
  return clamp((toned - 128) * contrast + 128, 0, 255);
}

function applyToneCurve(luminance, toneCurve) {
  const normalized = clamp(luminance / 255, 0, 1);

  switch (toneCurve) {
    case "perceptual":
      return Math.sqrt(normalized) * 255;
    case "gamma":
      return Math.pow(normalized, 1 / 2.2) * 255;
    case "linear":
    default:
      return normalized * 255;
  }
}

function interleavedGradientNoise(x, y, seed) {
  const shiftedX = x + seed * 0.071;
  const shiftedY = y + seed * 0.113;
  const value = 52.9829189 * fract(0.06711056 * shiftedX + 0.00583715 * shiftedY);
  return fract(value);
}

function diffuseError(buffer, width, height, x, y, amount) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }

  buffer[y * width + x] += amount;
}

function hashNoise(x, y, seed) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.12345) * 43758.5453;
  return fract(value);
}

function fract(value) {
  return value - Math.floor(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setStatus(message) {
  cameraStatus.textContent = message;
}

window.applyNoiseDitherFilter = applyNoiseDitherFilter;
window.applyOrderedDitherFilter = applyOrderedDitherFilter;
window.applyErrorDiffusionFilter = applyErrorDiffusionFilter;
window.findBestDetailFilter = findBestDetailFilter;
window.applySelectedFilter = applySelectedFilter;
