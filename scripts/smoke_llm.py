import argparse
import asyncio
import json
from pathlib import Path
import sys
import time

# Ensure repository root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.llm.client import call_llm, call_llm_json, LLMAvailabilityError, LLMParseError



async def run_smoke_test(prompt: str, is_json: bool = False):
    start_time = time.perf_counter()

    try:
        if is_json:
            json_prompt = 'Return JSON: {"status": "ok", "number": 42}'
            print(f"Executing JSON smoke test with prompt: {json_prompt}")
            result, provider = await call_llm_json(prompt=json_prompt, return_provider=True)
            latency_ms = (time.perf_counter() - start_time) * 1000
            print("-" * 50)
            print(f"Provider: {provider}")
            print(f"Latency:  {latency_ms:.2f} ms")
            print(f"Result (dict): {result}")
            print(f"Type: {type(result).__name__}")
            print("-" * 50)
        else:
            print(f"Executing smoke test with prompt: '{prompt}'")
            response, provider = await call_llm(prompt=prompt, return_provider=True)
            latency_ms = (time.perf_counter() - start_time) * 1000
            print("-" * 50)
            print(f"Provider: {provider}")
            print(f"Latency:  {latency_ms:.2f} ms")
            print(f"Response: {response}")
            print("-" * 50)
    except (LLMAvailabilityError, LLMParseError) as err:
        latency_ms = (time.perf_counter() - start_time) * 1000
        print("-" * 50, file=sys.stderr)
        print(f"LLM Error after {latency_ms:.2f} ms: {err}", file=sys.stderr)
        print("-" * 50, file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        latency_ms = (time.perf_counter() - start_time) * 1000
        print("-" * 50, file=sys.stderr)
        print(f"Unexpected error after {latency_ms:.2f} ms: {exc}", file=sys.stderr)
        print("-" * 50, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="ORCA Phase 0 LLM Client Smoke Test")
    parser.add_argument(
        "prompt",
        nargs="?",
        default="Reply with exactly: ORCA LLM layer operational",
        help="Custom prompt to send to the LLM",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help='Run JSON test with prompt \'Return JSON: {"status": "ok", "number": 42}\'',
    )
    args = parser.parse_args()

    asyncio.run(run_smoke_test(prompt=args.prompt, is_json=args.json))


if __name__ == "__main__":
    main()
