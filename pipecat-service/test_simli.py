"""Standalone Simli test to verify API connectivity."""

import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def test_simli_connection():
    """Test Simli API connection directly."""
    from simli import SimliClient, SimliConfig

    api_key = os.getenv("SIMLI_API_KEY")
    face_id = os.getenv("SIMLI_FACE_ID")

    print(f"Testing Simli connection...")
    print(f"  API Key: {api_key[:8]}...")
    print(f"  Face ID: {face_id}")

    config = SimliConfig(api_key, face_id)
    client = SimliClient(config)

    print("\nInitializing Simli client...")

    # Check client attributes
    print(f"  Client ready state: {getattr(client, 'ready', 'N/A')}")
    print(f"  Client attributes: {[a for a in dir(client) if not a.startswith('_')]}")

    # Try to initialize/start the client
    try:
        # Check if there's an initialize or start method
        if hasattr(client, 'Initialize'):
            print("\nCalling client.Initialize()...")
            await client.Initialize()
            print(f"  After Initialize, ready: {getattr(client, 'ready', 'N/A')}")

        if hasattr(client, 'start'):
            print("\nCalling client.start()...")
            await client.start()
            print(f"  After start, ready: {getattr(client, 'ready', 'N/A')}")

        # Wait a bit for connection
        print("\nWaiting 5 seconds for connection...")
        await asyncio.sleep(5)
        print(f"  Final ready state: {getattr(client, 'ready', 'N/A')}")

    except Exception as e:
        print(f"\nError: {type(e).__name__}: {e}")
    finally:
        if hasattr(client, 'close'):
            await client.close()
        elif hasattr(client, 'stop'):
            await client.stop()


async def test_simli_session_token():
    """Test getting a session token from Simli API."""
    import httpx

    api_key = os.getenv("SIMLI_API_KEY")
    face_id = os.getenv("SIMLI_FACE_ID")

    print("\n" + "="*50)
    print("Testing Simli session token API...")
    print("="*50)

    async with httpx.AsyncClient() as client:
        # Try the session token endpoint
        try:
            response = await client.post(
                "https://api.simli.ai/startE2ESession",
                json={
                    "faceId": face_id,
                    "isJPG": False,
                },
                headers={
                    "Content-Type": "application/json",
                    "x-simli-api-key": api_key,
                }
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")


async def main():
    await test_simli_session_token()
    print("\n")
    await test_simli_connection()


if __name__ == "__main__":
    asyncio.run(main())
