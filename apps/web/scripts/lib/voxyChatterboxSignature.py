#!/usr/bin/env python3
"""Private offline Chatterbox worker for a manifest-defined Voxy signature."""

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
    if not os.environ.get("HTTPS_PROXY", "").startswith("http://127.0.0.1:"):
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


def synthesize_job(model, job: dict) -> dict:
    print(f"signature_job_start:{job['id']}", flush=True)
    parameters = job["parameters"]
    reference_path = Path(job["referencePath"])
    model.prepare_conditionals(str(reference_path), exaggeration=float(parameters["exaggeration"]))
    generated: list[torch.Tensor] = []
    timeline: list[dict] = []
    cursor_samples = 0

    for index, segment in enumerate(job["segments"]):
        seed = int(parameters["seed"]) + int(job["seedOffset"]) + index
        torch.manual_seed(seed)
        started = time.monotonic()
        wav = model.generate(
            segment["spokenText"],
            language_id="de",
            exaggeration=float(parameters["exaggeration"]),
            cfg_weight=float(parameters["cfgWeight"]),
            temperature=float(parameters["temperature"]),
            repetition_penalty=float(parameters["repetitionPenalty"]),
            min_p=float(parameters["minP"]),
            top_p=float(parameters["topP"]),
        ).detach().cpu().to(torch.float32)
        if wav.ndim == 1:
            wav = wav.unsqueeze(0)
        start_samples = cursor_samples
        generated.append(wav)
        cursor_samples += wav.shape[-1]
        pause_ms = round(int(segment["pauseAfterMs"]) * float(parameters["pauseScale"]))
        if pause_ms:
            generated.append(silence(model.sr, pause_ms))
            cursor_samples += round(model.sr * pause_ms / 1000)
        timeline.append(
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
    output_path = Path(job["outputPath"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torchaudio.save(str(output_path), combined, model.sr, encoding="PCM_S", bits_per_sample=16)
    result = {
        "id": job["id"],
        "modeId": job["modeId"],
        "variantId": job["variantId"],
        "situationId": job["situationId"],
        "purpose": job["purpose"],
        "file": str(output_path),
        "sha256": sha256(output_path),
        "durationMs": round(combined.shape[-1] * 1000 / model.sr),
        "sampleRate": model.sr,
        "channels": 1,
        "watermarkScore": watermark_score(output_path),
        "timeline": timeline,
    }
    print(f"signature_job_done:{job['id']}:{result['durationMs']}ms", flush=True)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    require_offline_environment()
    network_attempts = install_socket_block()

    # German does not use this optional Chinese tokenizer dependency.
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
    print(f"signature_model_load_start:{device}", flush=True)
    model = ChatterboxMultilingualTTS.from_local(model_dir, device, t3_model="v3")
    if model.watermarker is None:
        raise RuntimeError("perth_watermarker_unavailable")
    print("signature_model_load_done", flush=True)

    results = [synthesize_job(model, job) for job in config["jobs"]]
    if network_attempts:
        raise RuntimeError(f"blocked_network_attempts_detected:{network_attempts}")
    Path(config["resultPath"]).write_text(
        json.dumps(
            {
                "device": device,
                "torchVersion": torch.__version__,
                "mpsAvailable": torch.backends.mps.is_available(),
                "networkAttempts": network_attempts,
                "runtimeNetworkRequests": 0,
                "jobs": results,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
