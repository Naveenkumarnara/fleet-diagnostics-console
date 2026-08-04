FROM node:22-alpine AS build
# better-sqlite3 compiles a native addon — needs build tools on Alpine (musl libc)
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# prune dev deps here so the prod stage can copy node_modules directly
# (avoids re-running the native compile with no build tools in the prod image)
RUN npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
