#!/usr/bin/env python3
"""Private, offline Chatterbox synthesis worker for the Voxy first-party bake-off."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import sys
import time

import librosa
import torch
import torchaudio


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_offline_environment() -> None:
    if os.environ.get("HF_HUB_OFFLINE") != "1" or os.environ.get("TRANSFORMERS_OFFLINE") != "1":
        raise RuntimeError("offline_environment_required")
    proxy = os.environ.get("HTTPS_PROXY", "")
    if not proxy.startswith("http://127.0.0.1:"):
        raise RuntimeError("fail_closed_loopback_proxy_required")


def install_socket_block() -> list[str]:
    attempts: list[str] = []

    def blocked_connect(_self, address):
        attempts.append(str(address))
        raise OSError("network_disabled_for_private_voice_synthesis")

    def blocked_create_connection(address, *args, **kwargs):
        attempts.append(str(address))
        raise OSError("network_disabled_for_private_voice_synthesis")

    socket.socket.connect = blocked_connect
    socket.create_connection = blocked_create_connection
    return attempts


def silence(sample_rate: int, milliseconds: int) -> torch.Tensor:
    return torch.zeros((1, round(sample_rate * milliseconds / 1000)), dtype=torch.float32)


def watermark_score(path: Path) -> float:
    import perth

    samples, sample_rate = librosa.load(path, sr=None)
    watermarker = perth.PerthImplicitWatermarker()
    if watermarker is None:
        raise RuntimeError("perth_watermarker_unavailable")
    return float(watermarker.get_watermark(samples, sample_rate=sample_rate))


def synthesize_take(model, take, segments, output_path: Path) -> dict:
    reference_path = Path(take["referencePath"])
    model.prepare_conditionals(str(reference_path), exaggeration=float(take["exaggeration"]))
    generated: list[torch.Tensor] = []
    timing: list[dict] = []
    cursor_samples = 0
    base_pauses = [520, 650, 650, 700, 620, 620, 720, 650, 700, 650, 0]
    for index, segment in enumerate(segments):
        seed = int(take["seed"]) + index
        torch.manual_seed(seed)
        started = time.monotonic()
        wav = model.generate(
            segment["spokenText"],
            language_id="de",
            exaggeration=float(take["exaggeration"]),
            cfg_weight=float(take["cfgWeight"]),
            temperature=float(take["temperature"]),
            repetition_penalty=float(take["repetitionPenalty"]),
            min_p=float(take["minP"]),
            top_p=float(take["topP"]),
        ).detach().cpu().to(torch.float32)
        if wav.ndim == 1:
            wav = wav.unsqueeze(0)
        start_samples = cursor_samples
        generated.append(wav)
        cursor_samples += wav.shape[-1]
        pause_ms = round(base_pauses[index] * float(take["pauseScale"]))
        if pause_ms:
            pause = silence(model.sr, pause_ms)
            generated.append(pause)
            cursor_samples += pause.shape[-1]
        timing.append(
            {
                "id": segment["id"],
                "visibleText": segment["visibleText"],
                "spokenText": segment["spokenText"],
                "seed": seed,
                "startMs": round(start_samples * 1000 / model.sr),
                "speechEndMs": round((start_samples + wav.shape[-1]) * 1000 / model.sr),
                "endMs": round(cursor_samples * 1000 / model.sr),
                "generationSeconds": round(time.monotonic() - started, 3),
            }
        )
    combined = torch.cat(generated, dim=-1)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torchaudio.save(str(output_path), combined, model.sr, encoding="PCM_S", bits_per_sample=16)
    return {
        "file": str(output_path),
        "sha256": sha256(output_path),
        "durationMs": round(combined.shape[-1] * 1000 / model.sr),
        "sampleRate": model.sr,
        "channels": 1,
        "watermarkScore": watermark_score(output_path),
        "timeline": timing,
    }


def synthesize_matrix_take(model, take, text: str, output_path: Path) -> dict:
    reference_path = Path(take["referencePath"])
    torch.manual_seed(int(take["seed"]))
    started = time.monotonic()
    wav = model.generate(
        text,
        language_id="de",
        audio_prompt_path=str(reference_path),
        exaggeration=float(take["exaggeration"]),
        cfg_weight=float(take["cfgWeight"]),
        temperature=float(take["temperature"]),
        repetition_penalty=1.2,
        min_p=0.05,
        top_p=1.0,
    ).detach().cpu().to(torch.float32)
    if wav.ndim == 1:
        wav = wav.unsqueeze(0)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torchaudio.save(str(output_path), wav, model.sr, encoding="PCM_S", bits_per_sample=16)
    return {
        "id": take["id"],
        "file": str(output_path),
        "sha256": sha256(output_path),
        "durationMs": round(wav.shape[-1] * 1000 / model.sr),
        "watermarkScore": watermark_score(output_path),
        "generationSeconds": round(time.monotonic() - started, 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    require_offline_environment()
    network_attempts = install_socket_block()

    # German does not use the Chinese segmenter. Prevent its optional model from
    # being initialized or downloaded by the multilingual tokenizer constructor.
    sys.modules["spacy_pkuseg"] = None

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    from chatterbox.models.tokenizers import tokenizer as chatterbox_tokenizer

    model_dir = Path(config["modelDir"])
    for model_file in config["modelFiles"]:
        file_path = model_dir / model_file["path"]
        if not file_path.is_file() or sha256(file_path) != model_file["sha256"]:
            raise RuntimeError(f"model_file_integrity_failed:{model_file['path']}")

    def local_model_file(*, filename, **_kwargs):
        file_path = model_dir / filename
        if not file_path.is_file():
            raise FileNotFoundError(filename)
        return str(file_path)

    chatterbox_tokenizer.hf_hub_download = local_model_file

    device = config["device"]
    if device == "mps" and not torch.backends.mps.is_available():
        raise RuntimeError("mps_requested_but_unavailable")
    model = ChatterboxMultilingualTTS.from_local(model_dir, device, t3_model="v3")
    if model.watermarker is None:
        raise RuntimeError("perth_watermarker_unavailable")

    matrix_results = []
    for take in config["parameterMatrix"]:
        matrix_results.append(
            synthesize_matrix_take(
                model,
                take,
                config["matrixText"],
                Path(config["outputDir"]) / "parameter-matrix" / f"{take['id']}.wav",
            )
        )

    candidate_results = []
    for take in config["variants"]:
        raw_path = Path(config["outputDir"]) / take["id"] / "raw.wav"
        candidate_results.append(
            {
                "id": take["id"],
                "parameters": {key: value for key, value in take.items() if key != "referencePath"},
                "raw": synthesize_take(model, take, config["segments"], raw_path),
            }
        )

    result = {
        "device": device,
        "torchVersion": torch.__version__,
        "mpsAvailable": torch.backends.mps.is_available(),
        "networkAttempts": network_attempts,
        "runtimeNetworkRequests": 0,
        "matrix": matrix_results,
        "candidates": candidate_results,
    }
    if network_attempts:
        raise RuntimeError(f"blocked_network_attempts_detected:{network_attempts}")
    Path(config["resultPath"]).write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
