#!/usr/bin/env python3
"""Standalone Simli test - verifies video frames can be received."""

import asyncio
import os
import sys
import ssl
import certifi

# Fix SSL certificate issue on macOS
os.environ['SSL_CERT_FILE'] = certifi.where()

from dotenv import load_dotenv
load_dotenv()

async def test_simli_video():
    """Test Simli connection and video frame reception."""
    from simli import SimliClient, SimliConfig

    api_key = os.getenv("SIMLI_API_KEY")
    face_id = os.getenv("SIMLI_FACE_ID")

    print(f"=" * 60)
    print("SIMLI STANDALONE TEST")
    print(f"=" * 60)
    print(f"API Key: {api_key[:10]}..." if api_key else "API Key: NOT SET")
    print(f"Face ID: {face_id}")
    print(f"SSL Cert: {certifi.where()}")
    print(f"=" * 60)

    config = SimliConfig(api_key, face_id)
    client = SimliClient(config=config, enable_logging=True)

    print("\n[1] Initializing Simli client...")
    try:
        await asyncio.wait_for(client.Initialize(), timeout=30.0)
        print(f"[1] Initialization returned")
        print(f"    Ready state: {client.ready.is_set()}")
        if not client.ready.is_set():
            print("[1] ✗ WARNING: Client ready state is False!")
        else:
            print("[1] ✓ Simli initialized successfully!")
    except asyncio.TimeoutError:
        print("[1] ✗ TIMEOUT: Simli initialization took >30 seconds")
        print(f"    Ready state: {client.ready.is_set()}")
        return False
    except Exception as e:
        print(f"[1] ✗ ERROR: {type(e).__name__}: {e}")
        return False

    # Only proceed if ready
    if not client.ready.is_set():
        print("\n[!] Cannot proceed - client not ready")
        await client.stop()
        return False

    print("\n[2] Sending silence to trigger video...")
    try:
        await client.sendSilence()
        print("[2] ✓ Silence sent")
    except Exception as e:
        print(f"[2] ✗ ERROR sending silence: {e}")

    print("\n[3] Attempting to receive video frames...")
    video_frames_received = 0

    try:
        video_iter = client.getVideoStreamIterator(targetFormat="rgb24")

        async def receive_video():
            nonlocal video_frames_received
            async for frame in video_iter:
                video_frames_received += 1
                if video_frames_received == 1:
                    print(f"    First video frame: {frame.width}x{frame.height}")
                if video_frames_received >= 10:
                    break

        await asyncio.wait_for(receive_video(), timeout=15.0)
        print(f"[3] ✓ Received {video_frames_received} video frames!")

    except asyncio.TimeoutError:
        print(f"[3] ✗ TIMEOUT: Only received {video_frames_received} video frames in 15 seconds")
    except Exception as e:
        print(f"[3] ✗ ERROR receiving video: {type(e).__name__}: {e}")

    print("\n[4] Cleaning up...")
    try:
        await client.stop()
        print("[4] ✓ Client stopped")
    except Exception as e:
        print(f"[4] Warning: {e}")

    print(f"\n{'=' * 60}")
    if video_frames_received > 0:
        print("RESULT: ✓ SUCCESS - Simli video is working!")
        return True
    else:
        print("RESULT: ✗ FAILED - No video frames received")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_simli_video())
    sys.exit(0 if success else 1)
