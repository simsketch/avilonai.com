"""FastAPI server for Pipecat service."""

import asyncio
import base64
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pydantic import BaseModel

from config import Config
from bot import run_bot, AvatarType
from bot_websocket import handle_websocket_session


# Track running bots
running_bots: dict[str, asyncio.Task] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    missing = Config.validate()
    if missing:
        logger.warning(f"Missing configuration: {missing}")

    logger.info("Pipecat service starting...")
    yield

    # Shutdown
    logger.info("Shutting down Pipecat service...")
    # Cancel all running bots
    for bot_id, task in running_bots.items():
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    logger.info("All bots stopped")


app = FastAPI(
    title="Avilon Pipecat Service",
    description="Real-time conversational AI therapy with Pipecat",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectRequest(BaseModel):
    """Request to create a new room and spawn a bot."""
    session_id: Optional[str] = None
    room_name: Optional[str] = None
    avatar_type: AvatarType = "sprite"  # "simli", "sprite", or "rpm"


class ConnectResponse(BaseModel):
    """Response with room details for the client to join."""
    room_url: str
    token: str
    bot_id: str
    avatar_type: AvatarType


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    missing_config: list[str]


async def create_daily_room(
    room_name: Optional[str] = None,
    enable_video: bool = False,
) -> dict:
    """Create a Daily.co room via REST API."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{Config.DAILY_API_URL}/rooms",
            headers={
                "Authorization": f"Bearer {Config.DAILY_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "name": room_name or f"avilon-{uuid.uuid4().hex[:8]}",
                "properties": {
                    "enable_chat": False,
                    "enable_screenshare": False,
                    "enable_recording": False,
                    "start_audio_off": False,
                    "start_video_off": not enable_video,  # Enable for Simli avatar
                    "exp": None,  # No expiration
                    "eject_at_room_exp": True,
                },
            },
        )

        if response.status_code != 200:
            logger.error(f"Failed to create room: {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create Daily room: {response.text}",
            )

        return response.json()


async def create_meeting_token(room_name: str, is_owner: bool = False) -> str:
    """Create a meeting token for joining a Daily.co room."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{Config.DAILY_API_URL}/meeting-tokens",
            headers={
                "Authorization": f"Bearer {Config.DAILY_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "properties": {
                    "room_name": room_name,
                    "is_owner": is_owner,
                    "enable_screenshare": False,
                    "start_audio_off": False,
                    "start_video_off": True,
                },
            },
        )

        if response.status_code != 200:
            logger.error(f"Failed to create token: {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create meeting token: {response.text}",
            )

        data = response.json()
        return data["token"]


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    missing = Config.validate()
    return HealthResponse(
        status="healthy" if not missing else "degraded",
        missing_config=missing,
    )


@app.post("/connect", response_model=ConnectResponse)
async def connect(request: ConnectRequest, background_tasks: BackgroundTasks):
    """
    Create a room and spawn a bot for a new session.

    Returns room URL and token for the client to join.
    """
    avatar_type = request.avatar_type

    # Validate configuration based on avatar type
    missing = Config.validate(avatar_type)
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Service not configured. Missing: {', '.join(missing)}",
        )

    # Create Daily.co room (enable video for Simli)
    enable_video = avatar_type == "simli"
    room = await create_daily_room(request.room_name, enable_video=enable_video)
    room_url = room["url"]
    room_name = room["name"]

    logger.info(f"Created room: {room_url} (avatar: {avatar_type})")

    # Create tokens
    bot_token = await create_meeting_token(room_name, is_owner=True)
    client_token = await create_meeting_token(room_name, is_owner=False)

    # Generate bot ID
    bot_id = f"bot-{uuid.uuid4().hex[:8]}"

    # Spawn bot in background
    async def spawn_bot():
        try:
            await run_bot(room_url, bot_token, request.session_id, avatar_type)
        except Exception as e:
            logger.error(f"Bot {bot_id} error: {e}")
        finally:
            running_bots.pop(bot_id, None)
            logger.info(f"Bot {bot_id} stopped")

    # Create and track the bot task
    task = asyncio.create_task(spawn_bot())
    running_bots[bot_id] = task

    logger.info(f"Spawned bot {bot_id} for session {request.session_id}")

    return ConnectResponse(
        room_url=room_url,
        token=client_token,
        bot_id=bot_id,
        avatar_type=avatar_type,
    )


@app.delete("/bot/{bot_id}")
async def stop_bot(bot_id: str):
    """Stop a running bot."""
    task = running_bots.get(bot_id)
    if not task:
        raise HTTPException(status_code=404, detail="Bot not found")

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    running_bots.pop(bot_id, None)
    return {"status": "stopped", "bot_id": bot_id}


@app.get("/bots")
async def list_bots():
    """List all running bots."""
    return {
        "bots": [
            {"bot_id": bot_id, "running": not task.done()}
            for bot_id, task in running_bots.items()
        ]
    }


# WebSocket endpoint for browser-based Simli avatar
@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio processing with Simli avatar.

    The Simli avatar rendering happens in the browser using simli-client JS SDK.
    This avoids the Daily/LiveKit SDK conflict in Python.

    Flow:
    1. Frontend captures user audio, sends via WebSocket
    2. Backend: Deepgram STT → LLM → Cartesia TTS
    3. Backend sends TTS audio back via WebSocket
    4. Frontend feeds audio to Simli JS client for avatar rendering
    """
    await websocket.accept()

    # Get query parameters
    session_id = websocket.query_params.get("session_id")
    face_id = websocket.query_params.get("face_id")

    logger.info(f"WebSocket connection accepted: session={session_id}, face={face_id}")

    try:
        await handle_websocket_session(websocket, session_id, face_id)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        logger.info(f"WebSocket session ended: {session_id}")


class UploadFaceRequest(BaseModel):
    """Response from face upload."""
    face_id: str
    message: str


@app.post("/upload-face")
async def upload_face(file: UploadFile = File(...)):
    """
    Upload a photo to create a custom Simli face.

    Returns the face_id to use with the WebSocket audio endpoint.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file content
    content = await file.read()

    # Convert to base64 for Simli API
    image_base64 = base64.b64encode(content).decode()

    logger.info(f"Uploading face image: {file.filename} ({len(content)} bytes)")

    try:
        async with httpx.AsyncClient() as client:
            # Create face using Simli API
            response = await client.post(
                "https://api.simli.ai/createFaceFromImage",
                headers={
                    "X-API-KEY": Config.SIMLI_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "image": image_base64,
                    "name": file.filename or "custom_face",
                },
                timeout=60.0,  # Face creation can take time
            )

            if response.status_code != 200:
                logger.error(f"Simli API error: {response.text}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create face: {response.text}",
                )

            result = response.json()
            face_id = result.get("faceId") or result.get("face_id")

            if not face_id:
                logger.error(f"No face_id in response: {result}")
                raise HTTPException(
                    status_code=500,
                    detail="No face_id returned from Simli",
                )

            logger.info(f"Face created successfully: {face_id}")

            return {
                "face_id": face_id,
                "message": "Face created successfully",
            }

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Face creation timed out. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating face: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating face: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True,
    )
