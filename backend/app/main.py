"""Main FastAPI application integrating REST API and Strawberry GraphQL."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter
from backend.app.core.config import settings
from backend.app.interfaces.graphql.schema import schema
from backend.app.interfaces.rest.auth_router import router as auth_router
from backend.app.interfaces.rest.courier_router import router as courier_router
from backend.app.interfaces.rest.dispute_router import router as dispute_router
from backend.app.interfaces.rest.master_data_router import router as master_router
from backend.app.interfaces.rest.parcel_router import router as parcel_router
from backend.app.interfaces.rest.tour_router import router as tour_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TMS EXPRESS: API REST & GraphQL pour la logistique urbaine et régionale.",
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(parcel_router, prefix=settings.API_V1_STR)
app.include_router(tour_router, prefix=settings.API_V1_STR)
app.include_router(courier_router, prefix=settings.API_V1_STR)
app.include_router(dispute_router, prefix=settings.API_V1_STR)
app.include_router(master_router, prefix=settings.API_V1_STR)

# Mount Strawberry GraphQL
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")


@app.get("/health", tags=["Monitoring"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timezone": settings.TIMEZONE,
        "currency": settings.CURRENCY,
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Bienvenue sur l'API {settings.PROJECT_NAME} v{settings.VERSION}",
        "docs_url": "/docs",
        "graphql_url": "/graphql",
    }
