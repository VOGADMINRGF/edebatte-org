# Voxy visual hand detector notices

The selected `voxy_raster_silhouette_hand_landmarker` detector is first-party,
dependency-free TypeScript operating on local RGBA pixels. It does not include,
copy, download, or redistribute MediaPipe code, WebAssembly, model bundles, or
model weights. No detector-specific third-party attribution is therefore
required.

The existing Playwright/Chromium capture harness is used only to rasterize and
decode the locally generated PNG evidence. Its bundled `LICENSE` and `NOTICE`
files remain the authoritative notices for that pre-existing development
dependency; the detector adds no new transitive runtime package.

MediaPipe Tasks Hand Landmarker remains an unshipped candidate only. Its
framework/sample license does not constitute approval for a concrete task-model
bundle or its redistribution terms.
