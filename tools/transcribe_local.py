"""On-device word timestamps via faster-whisper, used by `transcribe.mjs --local`.

Args: <video> <model> [vocabulary prompt]
Prints a JSON list of {"text", "start", "end"} to stdout.
Tries an NVIDIA GPU first and falls back to the CPU.
"""
import json
import sys

from faster_whisper import WhisperModel


def words_from(video, model_name, prompt, device, compute_type):
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, _info = model.transcribe(
        video,
        word_timestamps=True,
        vad_filter=True,
        initial_prompt=prompt or None,  # same vocabulary hint the Groq route sends
    )
    result = []
    for segment in segments:
        for word in segment.words:
            result.append({"text": word.word.strip(), "start": round(word.start, 3), "end": round(word.end, 3)})
    return result


def main():
    video, model_name = sys.argv[1], sys.argv[2]
    prompt = sys.argv[3] if len(sys.argv) > 3 else ""
    try:
        words = words_from(video, model_name, prompt, "cuda", "int8_float16")
    except Exception as error:  # no GPU, or CUDA libraries not installed
        print(f"GPU not usable ({error}); falling back to CPU", file=sys.stderr)
        words = words_from(video, model_name, prompt, "cpu", "int8")
    print(json.dumps(words))


if __name__ == "__main__":
    main()
