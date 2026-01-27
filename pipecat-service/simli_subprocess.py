"""Simli avatar subprocess - runs isolated to avoid SDK conflicts with Daily.

This subprocess handles Simli video generation separately from the main Pipecat pipeline.
Communication happens via stdin/stdout using JSON messages.
"""

import asyncio
import json
import os
import sys
import certifi
from loguru import logger

# Fix SSL certificate issue on macOS
os.environ['SSL_CERT_FILE'] = certifi.where()


async def run_simli_processor(api_key: str, face_id: str):
    """Run the Simli video processor in isolation."""
    from simli import SimliClient, SimliConfig

    logger.info(f"Starting Simli subprocess with face_id: {face_id}")

    config = SimliConfig(api_key, face_id)
    client = SimliClient(config=config, enable_logging=True)

    try:
        # Initialize Simli
        await client.Initialize()
        logger.info("Simli initialized successfully")

        # Send ready signal
        print(json.dumps({"type": "ready"}), flush=True)

        # Start video consumer task
        video_task = asyncio.create_task(consume_video(client))

        # Read audio from stdin and send to Simli
        reader = asyncio.StreamReader()
        protocol = asyncio.StreamReaderProtocol(reader)
        await asyncio.get_event_loop().connect_read_pipe(lambda: protocol, sys.stdin.buffer)

        while True:
            try:
                # Read message length (4 bytes, big-endian)
                length_bytes = await reader.read(4)
                if not length_bytes:
                    break

                length = int.from_bytes(length_bytes, 'big')

                # Read message
                message_bytes = await reader.read(length)
                if not message_bytes:
                    break

                message = json.loads(message_bytes.decode())

                if message["type"] == "audio":
                    # Decode base64 audio and send to Simli
                    import base64
                    audio_data = base64.b64decode(message["data"])
                    await client.send(audio_data)

                elif message["type"] == "stop":
                    break

            except Exception as e:
                logger.error(f"Error processing message: {e}")
                break

    except Exception as e:
        logger.error(f"Simli error: {e}")
        print(json.dumps({"type": "error", "message": str(e)}), flush=True)

    finally:
        await client.stop()
        logger.info("Simli subprocess stopped")


async def consume_video(client):
    """Consume video frames from Simli and output to stdout."""
    import base64

    try:
        video_iterator = client.getVideoStreamIterator(targetFormat="rgb24")
        frame_count = 0

        async for video_frame in video_iterator:
            frame_count += 1

            # Convert video frame to bytes
            frame_bytes = video_frame.to_rgb().to_image().tobytes()

            # Output as JSON with base64-encoded frame
            output = {
                "type": "video_frame",
                "width": video_frame.width,
                "height": video_frame.height,
                "data": base64.b64encode(frame_bytes).decode(),
            }

            # Write to stdout
            print(json.dumps(output), flush=True)

            if frame_count % 100 == 0:
                logger.debug(f"Sent {frame_count} video frames")

    except Exception as e:
        logger.error(f"Video consumer error: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"type": "error", "message": "Usage: python simli_subprocess.py <api_key> <face_id>"}))
        sys.exit(1)

    api_key = sys.argv[1]
    face_id = sys.argv[2]

    asyncio.run(run_simli_processor(api_key, face_id))
