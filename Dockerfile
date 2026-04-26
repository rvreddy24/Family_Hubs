# FamilyHubs.in — single image: Vite build + Node server (serves static + API + Socket.io)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/data ./src/data
COPY tsconfig.json ./
# tsx to run server TypeScript
EXPOSE 3001
CMD ["npx", "tsx", "server/index.ts"]
