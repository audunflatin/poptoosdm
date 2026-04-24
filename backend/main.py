from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from backend.api.auth import router as auth_router
from backend.api.admin import router as admin_router
from backend.api.health import router as health_router
from backend.core.settings import SESSION_SECRET

app = FastAPI(title="PopToOSDM")

app.mount("/static", StaticFiles(directory="frontend"), name="static")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(health_router)
