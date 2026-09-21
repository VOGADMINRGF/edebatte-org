import {
  getVoxyDetectorLicenseStatus,
  VOXY_VISUAL_DETECTOR_SELECTED,
  VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE,
  type VoxyHandDetectionEvidence,
  type VoxyHandLandmarkEvidence,
} from "./visualDetectorLicenseContract";

export const VOXY_VISUAL_HAND_DETECTOR_PROFILE = {
  schemaVersion: 2,
  id: VOXY_VISUAL_DETECTOR_SELECTED.modelId,
  supportedPose: "rotation_normalized_open_palm_flat_vector",
  orientationMethod: "foreground_pca_with_topology_disambiguation",
  normalizationMethod: "nearest_neighbor_binary_mask_rotation",
  orientationSearchStepDegrees: 5,
  normalizationScale: 1,
  paddingPixels: 24,
  minimumNormalizedBoundaryClearancePixels: 3,
  minimumPrincipalAxisStrength: 0.025,
  maximumInputBoundaryContactPixels: 0,
  minimumNormalizedAreaRetention: 0.96,
  minimumComponentAreaPixels: 180,
  minimumBoundingSidePixels: 24,
  neutralLightMinimumChannel: 170,
  neutralLightMaximumChannelSpread: 65,
  alphaMinimum: 200,
  fingerZoneFraction: 0.44,
  fingerColumnMinimumHeightFraction: 0.06,
  thumbZoneStartFraction: 0.42,
  thumbMinimumSideExtensionFraction: 0.1,
  minimumConfidence: VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE,
} as const;

export const VOXY_VISUAL_HAND_DETECTOR_PROFILE_SERIALIZED = JSON.stringify(
  VOXY_VISUAL_HAND_DETECTOR_PROFILE,
);

export type VoxyVisualHandDetectorImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  inputPath: string;
  inputSha256: string;
};

export type VoxyVisualHandDetectorInput = {
  hand: "left" | "right";
  image: VoxyVisualHandDetectorImage;
};

type Pixel = { x: number; y: number };
type Component = {
  pixels: Pixel[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};
type FingerRun = { minX: number; maxX: number; tipY: number };
type MaskRaster = { mask: Uint8Array; width: number; height: number };
type PrincipalAxis = {
  angleDegrees: number;
  strength: number;
  centroidX: number;
  centroidY: number;
};
type NormalizationCandidate = MaskRaster & {
  component: Component;
  fingerRuns: FingerRun[];
  thumbTip: Pixel | null;
  rotationDegrees: number;
  cropLoss: boolean;
  score: number;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

function normalizeDegrees(value: number): number {
  let normalized = value % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized <= -180) normalized += 360;
  return Math.abs(normalized) < 0.000_001 ? 0 : normalized;
}

function emptyEvidence(input: {
  hand: "left" | "right";
  inputPath: string;
  inputSha256: string;
  modelSha256: string;
  failureReason: string;
}): VoxyHandDetectionEvidence {
  return {
    hand: input.hand,
    detected: false,
    handedness: null,
    landmarks: [],
    landmarkCount: 0,
    confidence: 0,
    fingerCount: null,
    detectorId: VOXY_VISUAL_DETECTOR_SELECTED.id,
    detectorVersion: VOXY_VISUAL_DETECTOR_SELECTED.version,
    runtimeVersion: VOXY_VISUAL_DETECTOR_SELECTED.runtimeVersion,
    modelId: VOXY_VISUAL_DETECTOR_SELECTED.modelId,
    modelSha256: input.modelSha256,
    detectorProfileSha256: input.modelSha256,
    inputSha256: input.inputSha256,
    originalInputSha256: input.inputSha256,
    normalizedInputSha256: null,
    inputPath: input.inputPath,
    originalRotationDegrees: null,
    principalAxisDegrees: null,
    principalAxisStrength: null,
    normalizationApplied: false,
    paddingPixels: VOXY_VISUAL_HAND_DETECTOR_PROFILE.paddingPixels,
    normalizationCropLoss: false,
    localExecution: true,
    licenseStatus: getVoxyDetectorLicenseStatus(
      VOXY_VISUAL_DETECTOR_SELECTED.licenseMatrix,
    ),
    failureReason: input.failureReason,
  };
}

function buildNeutralLightMask(image: VoxyVisualHandDetectorImage): Uint8Array {
  const mask = new Uint8Array(image.width * image.height);
  for (let index = 0; index < mask.length; index += 1) {
    const offset = index * 4;
    const red = image.rgba[offset];
    const green = image.rgba[offset + 1];
    const blue = image.rgba[offset + 2];
    const alpha = image.rgba[offset + 3];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    if (
      alpha >= VOXY_VISUAL_HAND_DETECTOR_PROFILE.alphaMinimum &&
      minimum >= VOXY_VISUAL_HAND_DETECTOR_PROFILE.neutralLightMinimumChannel &&
      maximum - minimum <=
        VOXY_VISUAL_HAND_DETECTOR_PROFILE.neutralLightMaximumChannelSpread
    ) {
      mask[index] = 1;
    }
  }
  return mask;
}

function padMask(mask: Uint8Array, width: number, height: number): MaskRaster {
  const padding = VOXY_VISUAL_HAND_DETECTOR_PROFILE.paddingPixels;
  const paddedWidth = width + padding * 2;
  const paddedHeight = height + padding * 2;
  const padded = new Uint8Array(paddedWidth * paddedHeight);
  for (let y = 0; y < height; y += 1) {
    padded.set(
      mask.subarray(y * width, (y + 1) * width),
      (y + padding) * paddedWidth + padding,
    );
  }
  return { mask: padded, width: paddedWidth, height: paddedHeight };
}

function largestComponent(
  mask: Uint8Array,
  width: number,
  height: number,
): Component | null {
  const visited = new Uint8Array(mask.length);
  let largest: Component | null = null;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    const queue = [start];
    visited[start] = 1;
    const pixels: Pixel[] = [];
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const pixelIndex = queue[queueIndex];
      const x = pixelIndex % width;
      const y = (pixelIndex - x) / width;
      pixels.push({ x, y });
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue;
          const nextX = x + deltaX;
          const nextY = y + deltaY;
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
            continue;
          }
          const nextIndex = nextY * width + nextX;
          if (mask[nextIndex] && !visited[nextIndex]) {
            visited[nextIndex] = 1;
            queue.push(nextIndex);
          }
        }
      }
    }

    const component = { pixels, minX, maxX, minY, maxY };
    if (!largest || component.pixels.length > largest.pixels.length) {
      largest = component;
    }
  }

  return largest;
}

function principalAxis(component: Component): PrincipalAxis | null {
  if (component.pixels.length < 2) return null;
  const centroidX =
    component.pixels.reduce((sum, pixel) => sum + pixel.x, 0) /
    component.pixels.length;
  const centroidY =
    component.pixels.reduce((sum, pixel) => sum + pixel.y, 0) /
    component.pixels.length;
  let covarianceXX = 0;
  let covarianceYY = 0;
  let covarianceXY = 0;
  for (const pixel of component.pixels) {
    const deltaX = pixel.x - centroidX;
    const deltaY = pixel.y - centroidY;
    covarianceXX += deltaX * deltaX;
    covarianceYY += deltaY * deltaY;
    covarianceXY += deltaX * deltaY;
  }
  covarianceXX /= component.pixels.length;
  covarianceYY /= component.pixels.length;
  covarianceXY /= component.pixels.length;
  const trace = covarianceXX + covarianceYY;
  if (!Number.isFinite(trace) || trace <= 0) return null;
  const discriminant = Math.sqrt(
    (covarianceXX - covarianceYY) ** 2 + 4 * covarianceXY ** 2,
  );
  const strength = discriminant / trace;
  if (!Number.isFinite(strength)) return null;
  return {
    angleDegrees:
      (Math.atan2(2 * covarianceXY, covarianceXX - covarianceYY) * 90) /
      Math.PI,
    strength,
    centroidX,
    centroidY,
  };
}

function rotateMask(input: {
  raster: MaskRaster;
  component: Component;
  axis: PrincipalAxis;
  rotationDegrees: number;
}): MaskRaster {
  const componentWidth = input.component.maxX - input.component.minX + 1;
  const componentHeight = input.component.maxY - input.component.minY + 1;
  const padding = VOXY_VISUAL_HAND_DETECTOR_PROFILE.paddingPixels;
  const scale = VOXY_VISUAL_HAND_DETECTOR_PROFILE.normalizationScale;
  const size =
    (Math.ceil(Math.hypot(componentWidth, componentHeight)) + padding * 2) *
    scale;
  const output = new Uint8Array(size * size);
  const targetCenter = (size - 1) / 2;
  const radians = (input.rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  for (let y = 0; y < size; y += 1) {
    const deltaY = (y - targetCenter) / scale;
    for (let x = 0; x < size; x += 1) {
      const deltaX = (x - targetCenter) / scale;
      const sourceX = Math.round(
        input.axis.centroidX + cosine * deltaX + sine * deltaY,
      );
      const sourceY = Math.round(
        input.axis.centroidY - sine * deltaX + cosine * deltaY,
      );
      if (
        sourceX >= 0 &&
        sourceY >= 0 &&
        sourceX < input.raster.width &&
        sourceY < input.raster.height &&
        input.raster.mask[sourceY * input.raster.width + sourceX]
      ) {
        output[y * size + x] = 1;
      }
    }
  }
  return { mask: output, width: size, height: size };
}

function findFingerRuns(
  component: Component,
  mask: Uint8Array,
  imageWidth: number,
): FingerRun[] {
  const componentHeight = component.maxY - component.minY + 1;
  const fingerZoneEnd = Math.floor(
    component.minY +
      componentHeight * VOXY_VISUAL_HAND_DETECTOR_PROFILE.fingerZoneFraction,
  );
  const minimumColumnHeight = Math.max(
    2,
    Math.floor(
      componentHeight *
        VOXY_VISUAL_HAND_DETECTOR_PROFILE.fingerColumnMinimumHeightFraction,
    ),
  );
  const occupiedColumns: boolean[] = [];

  for (let x = component.minX; x <= component.maxX; x += 1) {
    let count = 0;
    for (let y = component.minY; y <= fingerZoneEnd; y += 1) {
      if (mask[y * imageWidth + x]) count += 1;
    }
    occupiedColumns.push(count >= minimumColumnHeight);
  }

  const runs: FingerRun[] = [];
  let runStart: number | null = null;
  for (let offset = 0; offset <= occupiedColumns.length; offset += 1) {
    const occupied = occupiedColumns[offset] ?? false;
    if (occupied && runStart === null) {
      runStart = offset;
    } else if (!occupied && runStart !== null) {
      const minX = component.minX + runStart;
      const maxX = component.minX + offset - 1;
      if (maxX - minX + 1 >= 2) {
        let tipY = fingerZoneEnd;
        for (let x = minX; x <= maxX; x += 1) {
          for (let y = component.minY; y <= fingerZoneEnd; y += 1) {
            if (mask[y * imageWidth + x]) tipY = Math.min(tipY, y);
          }
        }
        runs.push({ minX, maxX, tipY });
      }
      runStart = null;
    }
  }
  return runs;
}

function findThumbTip(input: {
  hand: "left" | "right";
  component: Component;
  fingerRuns: FingerRun[];
}): Pixel | null {
  if (input.fingerRuns.length === 0) return null;
  const componentWidth = input.component.maxX - input.component.minX + 1;
  const componentHeight = input.component.maxY - input.component.minY + 1;
  const thumbZoneStart =
    input.component.minY +
    componentHeight * VOXY_VISUAL_HAND_DETECTOR_PROFILE.thumbZoneStartFraction;
  const minimumExtension =
    componentWidth *
    VOXY_VISUAL_HAND_DETECTOR_PROFILE.thumbMinimumSideExtensionFraction;
  const fingerMinX = Math.min(...input.fingerRuns.map((run) => run.minX));
  const fingerMaxX = Math.max(...input.fingerRuns.map((run) => run.maxX));
  const candidates = input.component.pixels.filter((pixel) => {
    if (pixel.y < thumbZoneStart) return false;
    return input.hand === "left"
      ? pixel.x <= fingerMinX - minimumExtension
      : pixel.x >= fingerMaxX + minimumExtension;
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((best, candidate) => {
    if (input.hand === "left") {
      return candidate.x < best.x ? candidate : best;
    }
    return candidate.x > best.x ? candidate : best;
  });
}

function boundaryClearance(component: Component, width: number, height: number) {
  return Math.min(
    component.minX,
    component.minY,
    width - 1 - component.maxX,
    height - 1 - component.maxY,
  );
}

function normalizationCandidates(input: {
  hand: "left" | "right";
  raster: MaskRaster;
  component: Component;
  axis: PrincipalAxis;
}): NormalizationCandidate[] {
  const rotations = Array.from(
    {
      length:
        360 / VOXY_VISUAL_HAND_DETECTOR_PROFILE.orientationSearchStepDegrees,
    },
    (_, index) =>
      normalizeDegrees(
        -180 +
          index *
            VOXY_VISUAL_HAND_DETECTOR_PROFILE.orientationSearchStepDegrees,
      ),
  );
  const uniqueRotations = rotations.filter(
    (rotation, index) =>
      rotations.findIndex((candidate) => Math.abs(candidate - rotation) < 0.001) ===
      index,
  );
  return uniqueRotations.flatMap((rotationDegrees) => {
    const normalized = rotateMask({
      raster: input.raster,
      component: input.component,
      axis: input.axis,
      rotationDegrees,
    });
    const component = largestComponent(
      normalized.mask,
      normalized.width,
      normalized.height,
    );
    if (!component) return [];
    const fingerRuns = findFingerRuns(component, normalized.mask, normalized.width);
    const thumbTip = findThumbTip({ hand: input.hand, component, fingerRuns });
    const areaRetention =
      component.pixels.length /
      (input.component.pixels.length *
        VOXY_VISUAL_HAND_DETECTOR_PROFILE.normalizationScale ** 2);
    const cropLoss =
      boundaryClearance(component, normalized.width, normalized.height) <
        VOXY_VISUAL_HAND_DETECTOR_PROFILE.minimumNormalizedBoundaryClearancePixels ||
      areaRetention <
        VOXY_VISUAL_HAND_DETECTOR_PROFILE.minimumNormalizedAreaRetention;
    const topologyConfident =
      fingerRuns.length >= 3 && fingerRuns.length <= 5 && thumbTip !== null;
    const componentHeight = component.maxY - component.minY + 1;
    const fingerZoneEnd =
      component.minY +
      componentHeight * VOXY_VISUAL_HAND_DETECTOR_PROFILE.fingerZoneFraction;
    const meanFingerExtension =
      fingerRuns.length === 0
        ? 0
        : fingerRuns.reduce(
            (sum, run) =>
              sum + clamp01((fingerZoneEnd - run.tipY) / componentHeight),
            0,
          ) / fingerRuns.length;
    const meanTipY =
      fingerRuns.length === 0
        ? 0
        : fingerRuns.reduce((sum, run) => sum + run.tipY, 0) /
          fingerRuns.length;
    const tipSpread =
      fingerRuns.length === 0
        ? 1
        : Math.sqrt(
            fingerRuns.reduce(
              (sum, run) => sum + (run.tipY - meanTipY) ** 2,
              0,
            ) / fingerRuns.length,
          ) / componentHeight;
    const componentWidth = component.maxX - component.minX + 1;
    const lowerZoneStart = Math.floor(component.minY + componentHeight * 0.6);
    let maximumLowerRowWidth = 0;
    for (let y = lowerZoneStart; y <= component.maxY; y += 1) {
      let rowWidth = 0;
      for (let x = component.minX; x <= component.maxX; x += 1) {
        if (normalized.mask[y * normalized.width + x]) rowWidth += 1;
      }
      maximumLowerRowWidth = Math.max(maximumLowerRowWidth, rowWidth);
    }
    const lowerPalmSupport = maximumLowerRowWidth / componentWidth;
    const score =
      (topologyConfident ? 100 : 0) +
      (thumbTip ? 20 : 0) +
      meanFingerExtension * 30 -
      tipSpread * 10 +
      lowerPalmSupport * 30 +
      (cropLoss ? 0 : 10) -
      Math.abs(rotationDegrees) * 0.000_1;
    return [{
      ...normalized,
      component,
      fingerRuns,
      thumbTip,
      rotationDegrees,
      cropLoss,
      score,
    }];
  });
}

function countBoundaryPixels(component: Component, width: number, height: number) {
  return component.pixels.filter(
    (pixel) =>
      pixel.x <= 1 ||
      pixel.y <= 1 ||
      pixel.x >= width - 2 ||
      pixel.y >= height - 2,
  ).length;
}

function normalizedMaskBytes(candidate: NormalizationCandidate): Uint8Array {
  const header = new Uint8Array(8);
  const view = new DataView(header.buffer);
  view.setUint32(0, candidate.width);
  view.setUint32(4, candidate.height);
  const bytes = new Uint8Array(header.length + candidate.mask.length);
  bytes.set(header);
  bytes.set(candidate.mask, header.length);
  return bytes;
}

function landmark(
  index: number,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  confidence: number,
): VoxyHandLandmarkEvidence {
  return {
    index,
    name,
    x: clamp01(x / Math.max(1, width - 1)),
    y: clamp01(y / Math.max(1, height - 1)),
    confidence,
  };
}

function buildLandmarks(input: {
  component: Component;
  fingerRuns: FingerRun[];
  thumbTip: Pixel;
  imageWidth: number;
  imageHeight: number;
  confidence: number;
}): VoxyHandLandmarkEvidence[] {
  const centerX = (input.component.minX + input.component.maxX) / 2;
  const palmBaseY =
    input.component.minY +
    (input.component.maxY - input.component.minY) * 0.68;
  const landmarks: VoxyHandLandmarkEvidence[] = [
    landmark(
      0,
      "wrist",
      centerX,
      input.component.maxY,
      input.imageWidth,
      input.imageHeight,
      input.confidence,
    ),
  ];
  const fingers = [
    {
      name: "thumb",
      tipX: input.thumbTip.x,
      tipY: input.thumbTip.y,
      baseX: centerX,
      baseY: palmBaseY,
    },
    ...input.fingerRuns.map((run, index) => ({
      name: `upright_finger_${index + 1}`,
      tipX: (run.minX + run.maxX) / 2,
      tipY: run.tipY,
      baseX: (run.minX + run.maxX) / 2,
      baseY: palmBaseY,
    })),
  ];
  for (const finger of fingers) {
    for (let joint = 1; joint <= 4; joint += 1) {
      const progress = joint / 4;
      landmarks.push(
        landmark(
          landmarks.length,
          `${finger.name}_${joint === 4 ? "tip" : `joint_${joint}`}`,
          finger.baseX + (finger.tipX - finger.baseX) * progress,
          finger.baseY + (finger.tipY - finger.baseY) * progress,
          input.imageWidth,
          input.imageHeight,
          input.confidence,
        ),
      );
    }
  }
  return landmarks;
}

export class VoxyVisualHandDetector {
  readonly modelSha256: string;
  private readonly hashBytes: (value: Uint8Array) => string;

  constructor(input: {
    modelSha256: string;
    hashBytes: (value: Uint8Array) => string;
  }) {
    this.modelSha256 = input.modelSha256;
    this.hashBytes = input.hashBytes;
  }

  detect(input: VoxyVisualHandDetectorInput): VoxyHandDetectionEvidence {
    const { image, hand } = input;
    if (
      !Number.isInteger(image.width) ||
      !Number.isInteger(image.height) ||
      image.width <= 0 ||
      image.height <= 0 ||
      image.rgba.length !== image.width * image.height * 4
    ) {
      return emptyEvidence({
        hand,
        inputPath: image.inputPath,
        inputSha256: image.inputSha256,
        modelSha256: this.modelSha256,
        failureReason: "invalid_rgba_image",
      });
    }

    const sourceMask = buildNeutralLightMask(image);
    const sourceComponent = largestComponent(sourceMask, image.width, image.height);
    if (
      !sourceComponent ||
      sourceComponent.pixels.length <
        VOXY_VISUAL_HAND_DETECTOR_PROFILE.minimumComponentAreaPixels
    ) {
      return emptyEvidence({
        hand,
        inputPath: image.inputPath,
        inputSha256: image.inputSha256,
        modelSha256: this.modelSha256,
        failureReason: "hand_component_not_detected",
      });
    }

    const inputBoundaryContact =
      countBoundaryPixels(sourceComponent, image.width, image.height) >
      VOXY_VISUAL_HAND_DETECTOR_PROFILE.maximumInputBoundaryContactPixels;
    const padded = padMask(sourceMask, image.width, image.height);
    const paddedComponent = largestComponent(padded.mask, padded.width, padded.height);
    const axis = paddedComponent ? principalAxis(paddedComponent) : null;
    const axisReliable =
      axis !== null &&
      axis.strength >=
        VOXY_VISUAL_HAND_DETECTOR_PROFILE.minimumPrincipalAxisStrength;
    if (!paddedComponent || !axis || !axisReliable) {
      const evidence = emptyEvidence({
        hand,
        inputPath: image.inputPath,
        inputSha256: image.inputSha256,
        modelSha256: this.modelSha256,
        failureReason: "hand_principal_axis_unreliable",
      });
      return { ...evidence, detected: true };
    }

    const candidates = normalizationCandidates({
      hand,
      raster: padded,
      component: paddedComponent,
      axis,
    });
    const pcaAlignmentRotations = [
      -axis.angleDegrees,
      180 - axis.angleDegrees,
      90 - axis.angleDegrees,
      -90 - axis.angleDegrees,
    ].map(normalizeDegrees);
    const pcaAlignedCandidates = candidates.filter(
      (candidate) =>
        candidate.fingerRuns.length >= 3 &&
        candidate.fingerRuns.length <= 5 &&
        candidate.thumbTip !== null &&
        !candidate.cropLoss &&
        pcaAlignmentRotations.some(
          (rotation) =>
            Math.abs(
              normalizeDegrees(candidate.rotationDegrees - rotation),
            ) <=
            VOXY_VISUAL_HAND_DETECTOR_PROFILE.orientationSearchStepDegrees / 2,
        ),
    );
    const nearUprightPrincipalAxis =
      Math.abs(Math.abs(axis.angleDegrees) - 90) <= 20;
    const unrotatedCandidates = candidates.filter(
      (candidate) =>
        Math.abs(candidate.rotationDegrees) < 0.001 &&
        candidate.fingerRuns.length >= 3 &&
        candidate.fingerRuns.length <= 5 &&
        candidate.thumbTip !== null &&
        !candidate.cropLoss,
    );
    const candidatePool =
      nearUprightPrincipalAxis && unrotatedCandidates.length > 0
        ? unrotatedCandidates
        : pcaAlignedCandidates.length > 0
          ? pcaAlignedCandidates
          : candidates;
    candidatePool.sort((left, right) => right.score - left.score);
    const candidate = candidatePool[0];
    if (!candidate) {
      const evidence = emptyEvidence({
        hand,
        inputPath: image.inputPath,
        inputSha256: image.inputSha256,
        modelSha256: this.modelSha256,
        failureReason: "hand_normalization_failed",
      });
      return { ...evidence, detected: true };
    }

    const componentWidth = candidate.component.maxX - candidate.component.minX + 1;
    const componentHeight = candidate.component.maxY - candidate.component.minY + 1;
    const topologyConfident =
      candidate.fingerRuns.length >= 3 &&
      candidate.fingerRuns.length <= 5 &&
      candidate.thumbTip !== null;
    const resolutionScore = clamp01(
      Math.min(componentWidth, componentHeight) /
        VOXY_VISUAL_HAND_DETECTOR_PROFILE.minimumBoundingSidePixels,
    );
    const solidity =
      candidate.component.pixels.length /
      Math.max(1, componentWidth * componentHeight);
    const solidityScore = solidity >= 0.35 && solidity <= 0.85 ? 1 : 0.4;
    const confidence = clamp01(
      resolutionScore * 0.2 +
        (inputBoundaryContact || candidate.cropLoss ? 0 : 1) * 0.35 +
        (topologyConfident
          ? 1
          : candidate.fingerRuns.length >= 2
            ? 0.35
            : 0) *
          0.35 +
        solidityScore * 0.1,
    );
    const normalizedInputSha256 = this.hashBytes(normalizedMaskBytes(candidate));
    const normalizedHashValid = /^[a-f0-9]{64}$/i.test(normalizedInputSha256);
    const reliable =
      confidence >= VOXY_VISUAL_HAND_DETECTOR_PROFILE.minimumConfidence &&
      topologyConfident &&
      !inputBoundaryContact &&
      !candidate.cropLoss &&
      normalizedHashValid;
    const fingerCount = reliable ? candidate.fingerRuns.length + 1 : null;
    const landmarks =
      reliable && candidate.thumbTip
        ? buildLandmarks({
            component: candidate.component,
            fingerRuns: candidate.fingerRuns,
            thumbTip: candidate.thumbTip,
            imageWidth: candidate.width,
            imageHeight: candidate.height,
            confidence,
          })
        : [];
    const originalRotationDegrees = normalizeDegrees(-candidate.rotationDegrees);

    return {
      hand,
      detected: true,
      handedness: {
        label: hand,
        confidence,
        source: "capture_region_contract",
      },
      landmarks,
      landmarkCount: landmarks.length,
      confidence,
      fingerCount,
      detectorId: VOXY_VISUAL_DETECTOR_SELECTED.id,
      detectorVersion: VOXY_VISUAL_DETECTOR_SELECTED.version,
      runtimeVersion: VOXY_VISUAL_DETECTOR_SELECTED.runtimeVersion,
      modelId: VOXY_VISUAL_DETECTOR_SELECTED.modelId,
      modelSha256: this.modelSha256,
      detectorProfileSha256: this.modelSha256,
      inputSha256: image.inputSha256,
      originalInputSha256: image.inputSha256,
      normalizedInputSha256: normalizedHashValid
        ? normalizedInputSha256.toLowerCase()
        : null,
      inputPath: image.inputPath,
      originalRotationDegrees,
      principalAxisDegrees: axis.angleDegrees,
      principalAxisStrength: axis.strength,
      normalizationApplied: Math.abs(candidate.rotationDegrees) >= 0.5,
      paddingPixels: VOXY_VISUAL_HAND_DETECTOR_PROFILE.paddingPixels,
      normalizationCropLoss: candidate.cropLoss || inputBoundaryContact,
      localExecution: true,
      licenseStatus: getVoxyDetectorLicenseStatus(
        VOXY_VISUAL_DETECTOR_SELECTED.licenseMatrix,
      ),
      failureReason: reliable
        ? null
        : inputBoundaryContact
          ? "hand_component_touches_input_boundary"
          : candidate.cropLoss
            ? "hand_normalization_crop_loss"
            : !normalizedHashValid
              ? "normalized_input_sha256_missing"
              : !topologyConfident
                ? "hand_topology_insufficient_after_normalization"
                : "hand_confidence_insufficient_after_normalization",
    };
  }
}
