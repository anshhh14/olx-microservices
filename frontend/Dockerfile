# ── Build stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* env vars into the JS bundle at BUILD time (not runtime),
# so they're exposed as build args here. Defaults match docker-compose
# service ports. For a Kubernetes deploy, override at build time, e.g.:
#   docker build \
#     --build-arg VITE_USERS_API=http://localhost:30001/api/users \
#     --build-arg VITE_LISTINGS_API=http://localhost:30002/api/listings \
#     --build-arg VITE_CHAT_API=http://localhost:30003/api/chat \
#     -t frontend:local ./frontend
ARG VITE_USERS_API=http://localhost:3001/api/users
ARG VITE_LISTINGS_API=http://localhost:3002/api/listings
ARG VITE_CHAT_API=http://localhost:3003/api/chat
ENV VITE_USERS_API=$VITE_USERS_API
ENV VITE_LISTINGS_API=$VITE_LISTINGS_API
ENV VITE_CHAT_API=$VITE_CHAT_API

RUN npm run build

# ── Serve stage ──────────────────────────────────────────────────────────
FROM nginx:alpine

# SPA fallback: react-router-dom uses client-side routing (BrowserRouter),
# so unknown paths (e.g. a hard refresh on /browse) must fall back to
# index.html instead of 404ing.
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
