# Multi-stage build para @links-referidos/api dentro del monorepo npm
# workspaces. Se construye con el contexto en la raíz del repo:
#   docker build -f apps/api/Dockerfile -t links-referidos-api .

FROM node:22-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
RUN npm ci

FROM deps AS build
COPY apps/api apps/api
RUN npm run build --workspace=apps/api

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=deps /repo/node_modules node_modules
COPY --from=deps /repo/package.json package.json
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY apps/api/drizzle apps/api/drizzle
COPY apps/api/package.json apps/api/package.json

WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["node", "dist/server.js"]
