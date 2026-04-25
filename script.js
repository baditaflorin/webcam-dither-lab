const startCameraButton = document.getElementById("startCamera");
const stopCameraButton = document.getElementById("stopCamera");
const captureSnapshotButton = document.getElementById("captureSnapshot");
const copyShareLinkButton = document.getElementById("copyShareLink");
const resetLabButton = document.getElementById("resetLab");
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
const metricsHud = document.getElementById("metricsHud");

const CONTROL_KEYS = [
  "type",
  "colorMode",
  "palette",
  "toneCurve",
  "threshold",
  "noiseAmount",
  "contrast",
  "seed",
];
const THRESHOLD_MODES = new Set([
  "autoDetail",
  "threshold",
  "noiseDither",
  "ignDither",
  "rgbDither",
  "parker3",
  "bayer4",
  "floydSteinberg",
  "atkinson",
  "burkes",
  "sierraLite",
]);
const NOISE_MODES = new Set(["autoDetail", "noiseDither", "ignDither", "rgbDither"]);
const AUTO_DETAIL_CANDIDATES = [
  "parker3",
  "bayer4",
  "noiseDither",
  "ignDither",
  "rgbDither",
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

const COLOR_PALETTES = {
  paperInk: [
    [24, 22, 20],
    [98, 83, 72],
    [207, 86, 45],
    [245, 205, 124],
    [255, 248, 236],
  ],
  emberCyan: [
    [11, 18, 25],
    [20, 84, 99],
    [42, 186, 190],
    [242, 96, 57],
    [255, 235, 185],
  ],
  mossBloom: [
    [19, 29, 24],
    [47, 83, 64],
    [103, 158, 96],
    [214, 204, 97],
    [249, 241, 204],
  ],
  ultraviolet: [
    [12, 12, 28],
    [55, 45, 105],
    [109, 72, 165],
    [231, 86, 131],
    [247, 230, 255],
  ],
  solarPop: [
    [15, 19, 36],
    [29, 88, 133],
    [62, 168, 146],
    [248, 207, 85],
    [255, 250, 229],
  ],
};

const PRESETS = {
  detail: {
    split: 0.5,
    left: {
      type: "autoDetail",
      colorMode: "duotone",
      palette: "paperInk",
      toneCurve: "perceptual",
      threshold: 128,
      noiseAmount: 42,
      contrast: 1.15,
      seed: 137,
    },
    right: {
      type: "parker3",
      colorMode: "mono",
      palette: "paperInk",
      toneCurve: "linear",
      threshold: 128,
      noiseAmount: 12,
      contrast: 1.05,
      seed: 412,
    },
  },
  color: {
    split: 0.52,
    left: {
      type: "rgbDither",
      colorMode: "mono",
      palette: "emberCyan",
      toneCurve: "gamma",
      threshold: 118,
      noiseAmount: 34,
      contrast: 1.2,
      seed: 221,
    },
    right: {
      type: "burkes",
      colorMode: "source",
      palette: "emberCyan",
      toneCurve: "perceptual",
      threshold: 128,
      noiseAmount: 22,
      contrast: 1.08,
      seed: 412,
    },
  },
  poster: {
    split: 0.46,
    left: {
      type: "bayer4",
      colorMode: "palette",
      palette: "solarPop",
      toneCurve: "linear",
      threshold: 130,
      noiseAmount: 14,
      contrast: 1.35,
      seed: 80,
    },
    right: {
      type: "atkinson",
      colorMode: "duotone",
      palette: "solarPop",
      toneCurve: "gamma",
      threshold: 126,
      noiseAmount: 10,
      contrast: 1.28,
      seed: 212,
    },
  },
  soft: {
    split: 0.58,
    left: {
      type: "sierraLite",
      colorMode: "source",
      palette: "mossBloom",
      toneCurve: "perceptual",
      threshold: 124,
      noiseAmount: 18,
      contrast: 0.92,
      seed: 330,
    },
    right: {
      type: "grayscale",
      colorMode: "thermal",
      palette: "mossBloom",
      toneCurve: "perceptual",
      threshold: 128,
      noiseAmount: 0,
      contrast: 1.05,
      seed: 137,
    },
  },
  glitch: {
    split: 0.5,
    left: {
      type: "rgbDither",
      colorMode: "mono",
      palette: "ultraviolet",
      toneCurve: "linear",
      threshold: 120,
      noiseAmount: 72,
      contrast: 1.45,
      seed: 611,
    },
    right: {
      type: "ignDither",
      colorMode: "thermal",
      palette: "ultraviolet",
      toneCurve: "gamma",
      threshold: 136,
      noiseAmount: 60,
      contrast: 1.32,
      seed: 864,
    },
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
  isApplyingState: false,
  shareUpdateId: null,
  autoSelection: {
    left: createEmptyAutoSelection(),
    right: createEmptyAutoSelection(),
  },
  metrics: {
    fps: 0,
    renderMs: 0,
    lastTimestamp: 0,
  },
};

initialize();

function initialize() {
  setupFilterControls("left");
  setupFilterControls("right");
  setupSplitControls();
  setupPresetControls();
  setupActionButtons();
  restoreStateFromUrl();
  drawIdleState();
  updateFilterLabels();
  updateAutoNote("left");
  updateAutoNote("right");
  updateMetricsHud();

  startCameraButton.addEventListener("click", startCamera);
  stopCameraButton.addEventListener("click", stopCamera);
  window.addEventListener("beforeunload", stopCamera);
  window.addEventListener("hashchange", restoreStateFromUrl);

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
    colorMode: document.getElementById(`${side}ColorMode`),
    palette: document.getElementById(`${side}Palette`),
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
    scheduleUrlStateUpdate();
  });

  ["colorMode", "palette"].forEach((key) => {
    elements[key].addEventListener("change", () => {
      syncControlStates(side);
      updateFilterLabels();
      scheduleUrlStateUpdate();
    });
  });

  elements.toneCurve.addEventListener("change", () => {
    resetAutoSelection(side);
    updateFilterLabels();
    updateAutoNote(side);
    scheduleUrlStateUpdate();
  });

  ["threshold", "noiseAmount", "contrast", "seed"].forEach((key) => {
    elements[key].addEventListener("input", () => {
      elements.outputs[key].value = elements[key].value;
      resetAutoSelection(side);
      updateAutoNote(side);
      scheduleUrlStateUpdate();
    });
    elements.outputs[key].value = elements[key].value;
  });

  syncControlStates(side);
}

function setupPresetControls() {
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      applyPreset(button.dataset.preset);
    });
  });
}

function setupActionButtons() {
  captureSnapshotButton.addEventListener("click", captureSnapshot);
  copyShareLinkButton.addEventListener("click", copyShareLink);
  resetLabButton.addEventListener("click", () => applyPreset("detail"));
}

function resetAutoSelection(side) {
  state.autoSelection[side] = createEmptyAutoSelection();
}

function syncControlStates(side) {
  const elements = filterElements[side];
  const mode = elements.type.value;
  const colorMode = elements.colorMode.value;
  const needsThreshold = THRESHOLD_MODES.has(mode);
  const needsNoise = NOISE_MODES.has(mode);
  const needsContrast = mode !== "original" || colorMode !== "mono";
  const needsToneCurve = mode !== "original" || colorMode !== "mono";
  const needsPalette = colorMode !== "mono";

  toggleControl(elements.threshold, needsThreshold);
  toggleControl(elements.noiseAmount, needsNoise);
  toggleControl(elements.seed, needsNoise);
  toggleControl(elements.contrast, needsContrast);
  toggleControl(elements.toneCurve, needsToneCurve);
  toggleControl(elements.palette, needsPalette);
}

function toggleControl(element, enabled) {
  const wrapper = element.closest(".control");
  element.disabled = !enabled;
  wrapper.classList.toggle("is-disabled", !enabled);
}

function setupSplitControls() {
  setSplit(Number(splitSlider.value) / 100, { silent: true });

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
    scheduleUrlStateUpdate();
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

function setSplit(ratio, options = {}) {
  state.splitRatio = clamp(ratio, 0.1, 0.9);
  comparisonStage.style.setProperty(
    "--split-pos",
    `${(state.splitRatio * 100).toFixed(2)}%`
  );
  splitSlider.value = Math.round(state.splitRatio * 100);

  if (!options.silent) {
    scheduleUrlStateUpdate();
  }
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

    const renderStartedAt = performance.now();
    frameContext.drawImage(sourceVideo, 0, 0, frameCanvas.width, frameCanvas.height);
    const frame = frameContext.getImageData(0, 0, frameCanvas.width, frameCanvas.height);

    const leftOptions = resolveFilterOptions("left", frame, timestamp);
    const rightOptions = resolveFilterOptions("right", frame, timestamp);

    const leftImage = applyRenderPipeline(frame, leftOptions);
    const rightImage = applyRenderPipeline(frame, rightOptions);

    leftContext.putImageData(leftImage, 0, 0);
    rightContext.putImageData(rightImage, 0, 0);
    drawSplitComparison();
    updateFrameMetrics(timestamp, performance.now() - renderStartedAt);

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
  gradient.addColorStop(0, "#132d36");
  gradient.addColorStop(0.44, "#c94e40");
  gradient.addColorStop(0.68, "#2aa7a7");
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

  comparisonContext.fillStyle = "rgba(20, 20, 20, 0.88)";
  comparisonContext.fillRect(0, height * 0.58, width, height * 0.42);

  comparisonContext.fillStyle = "#fff4e5";
  comparisonContext.font = "700 32px 'Space Grotesk', sans-serif";
  comparisonContext.fillText("Start camera", 32, 48);
  comparisonContext.font = "500 18px 'IBM Plex Mono', monospace";
  comparisonContext.fillText("then compare dither, color, and detail", 32, 78);
}

function updateFilterLabels() {
  leftFilterLabel.textContent = buildFilterLabel("A", "left");
  rightFilterLabel.textContent = buildFilterLabel("B", "right");
  updateMetricsHud();
}

function buildFilterLabel(prefix, side) {
  const elements = filterElements[side];
  const mode = elements.type.value;
  const colorLabel =
    elements.colorMode.value === "mono" ? "" : ` · ${getColorModeLabel(elements.colorMode.value)}`;

  if (mode === "autoDetail") {
    const auto = state.autoSelection[side];
    if (!auto.mode) {
      return `${prefix} · Auto Detail${colorLabel}`;
    }
    return `${prefix} · Auto: ${getModeLabel(auto.mode)}${colorLabel}`;
  }

  if (mode === "original") {
    return `${prefix} · ${getModeLabel(mode)}${colorLabel}`;
  }

  return `${prefix} · ${getModeLabel(mode)} · ${getToneLabel(elements.toneCurve.value)}${colorLabel}`;
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

function updateFrameMetrics(timestamp, renderMs) {
  if (state.metrics.lastTimestamp) {
    const delta = Math.max(1, timestamp - state.metrics.lastTimestamp);
    const instantFps = 1000 / delta;
    state.metrics.fps = state.metrics.fps
      ? state.metrics.fps * 0.86 + instantFps * 0.14
      : instantFps;
  }

  state.metrics.lastTimestamp = timestamp;
  state.metrics.renderMs = state.metrics.renderMs
    ? state.metrics.renderMs * 0.84 + renderMs * 0.16
    : renderMs;
  updateMetricsHud();
}

function updateMetricsHud() {
  const left = getAutoMetricLabel("left");
  const right = getAutoMetricLabel("right");
  const fps = state.metrics.fps ? state.metrics.fps.toFixed(0) : "--";
  const renderMs = state.metrics.renderMs ? state.metrics.renderMs.toFixed(1) : "--";

  metricsHud.textContent = `FPS ${fps} · ${renderMs}ms · ${left} · ${right}`;
}

function getAutoMetricLabel(side) {
  const selectedMode = filterElements[side].type.value;

  if (selectedMode !== "autoDetail") {
    return `${side.toUpperCase()} ${getModeLabel(selectedMode)}`;
  }

  const auto = state.autoSelection[side];
  return auto.mode
    ? `${side.toUpperCase()} ${getModeLabel(auto.mode)} ${(auto.score * 100).toFixed(0)}%`
    : `${side.toUpperCase()} Auto`;
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
    case "rgbDither":
      return "RGB Dither";
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

function getColorModeLabel(colorMode) {
  switch (colorMode) {
    case "duotone":
      return "Duotone";
    case "palette":
      return "Palette";
    case "source":
      return "Source Color";
    case "thermal":
      return "Thermal";
    case "mono":
    default:
      return "Native";
  }
}

function getFilterOptions(side) {
  const elements = filterElements[side];

  return {
    mode: elements.type.value,
    colorMode: elements.colorMode.value,
    palette: elements.palette.value,
    toneCurve: elements.toneCurve.value,
    threshold: Number(elements.threshold.value),
    noiseAmount: Number(elements.noiseAmount.value),
    contrast: Number(elements.contrast.value),
    seed: Number(elements.seed.value),
  };
}

function applyRenderPipeline(imageData, options) {
  const filtered = applySelectedFilter(imageData, options);
  return applyColorMode(imageData, filtered, options);
}

function applySelectedFilter(imageData, options) {
  switch (options.mode) {
    case "parker3":
      return applyOrderedDitherFilter(imageData, options, PARKER_3X3_MATRIX);
    case "bayer4":
      return applyOrderedDitherFilter(imageData, options, BAYER_4X4_MATRIX);
    case "ignDither":
      return applyInterleavedGradientNoiseFilter(imageData, options);
    case "rgbDither":
      return applyRgbDitherFilter(imageData, options);
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

function applyRgbDitherFilter(imageData, options = {}) {
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
      const rNoise = (hashNoise(x, y, seed + 11) - 0.5) * noiseAmount * 2;
      const gNoise = (hashNoise(x, y, seed + 37) - 0.5) * noiseAmount * 2;
      const bNoise = (hashNoise(x, y, seed + 73) - 0.5) * noiseAmount * 2;

      destination[index] =
        applyChannelTone(source[index], contrast, toneCurve) + rNoise >= threshold ? 255 : 0;
      destination[index + 1] =
        applyChannelTone(source[index + 1], contrast, toneCurve) + gNoise >= threshold ? 255 : 0;
      destination[index + 2] =
        applyChannelTone(source[index + 2], contrast, toneCurve) + bNoise >= threshold ? 255 : 0;
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

function applyColorMode(sourceImageData, filteredImageData, options = {}) {
  const { colorMode = "mono", palette = "paperInk", contrast = 1, toneCurve = "linear" } =
    options;

  if (colorMode === "mono") {
    return filteredImageData;
  }

  const source = sourceImageData.data;
  const filtered = filteredImageData.data;
  const output = new ImageData(filteredImageData.width, filteredImageData.height);
  const destination = output.data;
  const colors = COLOR_PALETTES[palette] || COLOR_PALETTES.paperInk;

  for (let index = 0; index < filtered.length; index += 4) {
    const sourceR = source[index];
    const sourceG = source[index + 1];
    const sourceB = source[index + 2];
    const sourceLevel = getToneAdjustedLevel(sourceR, sourceG, sourceB, contrast, toneCurve);
    const filteredLevel = getLuminance(filtered[index], filtered[index + 1], filtered[index + 2]);
    const coverage = clamp(filteredLevel / 255, 0, 1);
    const sourceMix = 0.18 + coverage * 0.82;
    let color;

    if (colorMode === "duotone") {
      color = mixColor(colors[0], colors[colors.length - 1], coverage);
    } else if (colorMode === "palette") {
      const paletteColor = samplePalette(colors, sourceLevel / 255);
      color = mixColor(colors[0], paletteColor, 0.28 + coverage * 0.72);
    } else if (colorMode === "source") {
      color = mixColor(colors[0], [sourceR, sourceG, sourceB], sourceMix);
    } else {
      const paletteColor = samplePalette(colors, sourceLevel / 255);
      color = scaleColor(paletteColor, 0.34 + coverage * 0.66);
    }

    destination[index] = color[0];
    destination[index + 1] = color[1];
    destination[index + 2] = color[2];
    destination[index + 3] = filtered[index + 3];
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

function applyPreset(name) {
  const preset = PRESETS[name] || PRESETS.detail;

  state.isApplyingState = true;
  setSideState("left", preset.left);
  setSideState("right", preset.right);
  setSplit(preset.split, { silent: true });
  state.isApplyingState = false;

  resetAutoSelection("left");
  resetAutoSelection("right");
  syncControlStates("left");
  syncControlStates("right");
  updateFilterLabels();
  updateAutoNote("left");
  updateAutoNote("right");
  scheduleUrlStateUpdate();
}

function setSideState(side, values) {
  const elements = filterElements[side];

  CONTROL_KEYS.forEach((key) => {
    if (values[key] === undefined) {
      return;
    }

    elements[key].value = values[key];
  });

  updateOutputValues(side);
}

function getSideState(side) {
  const elements = filterElements[side];

  return {
    type: elements.type.value,
    colorMode: elements.colorMode.value,
    palette: elements.palette.value,
    toneCurve: elements.toneCurve.value,
    threshold: Number(elements.threshold.value),
    noiseAmount: Number(elements.noiseAmount.value),
    contrast: Number(elements.contrast.value),
    seed: Number(elements.seed.value),
  };
}

function updateOutputValues(side) {
  const elements = filterElements[side];
  ["threshold", "noiseAmount", "contrast", "seed"].forEach((key) => {
    elements.outputs[key].value = elements[key].value;
  });
}

function getLabState() {
  return {
    split: Number(state.splitRatio.toFixed(3)),
    left: getSideState("left"),
    right: getSideState("right"),
  };
}

function restoreStateFromUrl() {
  if (!window.location.hash.startsWith("#lab=")) {
    return;
  }

  try {
    const raw = window.location.hash.slice(5);
    const decoded = JSON.parse(decodeBase64Url(raw));

    state.isApplyingState = true;
    setSideState("left", decoded.left || PRESETS.detail.left);
    setSideState("right", decoded.right || PRESETS.detail.right);
    setSplit(Number(decoded.split || 0.5), { silent: true });
    state.isApplyingState = false;

    resetAutoSelection("left");
    resetAutoSelection("right");
    syncControlStates("left");
    syncControlStates("right");
    updateFilterLabels();
    updateAutoNote("left");
    updateAutoNote("right");
  } catch (error) {
    console.warn("Could not restore lab state from URL.", error);
  } finally {
    state.isApplyingState = false;
  }
}

function scheduleUrlStateUpdate() {
  if (state.isApplyingState) {
    return;
  }

  window.clearTimeout(state.shareUpdateId);
  state.shareUpdateId = window.setTimeout(writeStateToUrl, 180);
}

function writeStateToUrl() {
  const encoded = encodeBase64Url(JSON.stringify(getLabState()));
  const nextUrl = `${window.location.pathname}${window.location.search}#lab=${encoded}`;
  window.history.replaceState(null, "", nextUrl);
}

async function copyShareLink() {
  writeStateToUrl();
  const url = window.location.href;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
    } else {
      fallbackCopyText(url);
    }
    setStatus("Share link copied with the current lab settings.");
  } catch (error) {
    setStatus(`Could not copy automatically. Share URL: ${url}`);
  }
}

function fallbackCopyText(text) {
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function captureSnapshot() {
  const width = comparisonCanvas.width;
  const height = comparisonCanvas.height;
  const titleHeight = 62;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = width;
  exportCanvas.height = height + titleHeight;
  const context = exportCanvas.getContext("2d");

  context.fillStyle = "#111419";
  context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  context.drawImage(comparisonCanvas, 0, titleHeight);

  context.fillStyle = "#f9f2e9";
  context.font = "700 20px 'Space Grotesk', sans-serif";
  context.fillText("Webcam Dither Lab", 20, 26);
  context.font = "500 13px 'IBM Plex Mono', monospace";
  context.fillText(`${leftFilterLabel.textContent} / ${rightFilterLabel.textContent}`, 20, 48);

  const link = document.createElement("a");
  link.href = exportCanvas.toDataURL("image/png");
  link.download = `webcam-dither-lab-${Date.now()}.png`;
  link.click();
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
    levels[pixelIndex] = getLuminance(source[index], source[index + 1], source[index + 2]);
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
  const toned = applyToneCurve(getLuminance(r, g, b), toneCurve);
  return clamp((toned - 128) * contrast + 128, 0, 255);
}

function getLuminance(r, g, b) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function applyChannelTone(value, contrast, toneCurve) {
  const toned = applyToneCurve(value, toneCurve);
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

function samplePalette(colors, t) {
  const scaled = clamp(t, 0, 1) * (colors.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(colors.length - 1, index + 1);
  return mixColor(colors[index], colors[nextIndex], scaled - index);
}

function mixColor(a, b, t) {
  const amount = clamp(t, 0, 1);
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  ];
}

function scaleColor(color, amount) {
  return [
    Math.round(clamp(color[0] * amount, 0, 255)),
    Math.round(clamp(color[1] * amount, 0, 255)),
    Math.round(clamp(color[2] * amount, 0, 255)),
  ];
}

function encodeBase64Url(value) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(normalized)));
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
window.applyColorMode = applyColorMode;
window.findBestDetailFilter = findBestDetailFilter;
window.applySelectedFilter = applySelectedFilter;
