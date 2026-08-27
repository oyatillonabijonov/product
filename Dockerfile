# ProDuct — React Router SSR + SQLite. Coolify shu Dockerfile bilan quradi.
#
# Baza va rasmlar /app/data ichida — Coolify'da shu yo'lga **persistent volume**
# ulanishi shart, aks holda har deploy'da ma'lumot yo'qoladi.
FROM node:24-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 tayyor binar topmasa manbadan quriladi — shunda shular kerak.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/package.json ./

EXPOSE 3000

# Har ishga tushishda yangi migratsiyalar qo'llanadi, so'ng server ko'tariladi.
CMD ["sh", "-c", "node server/migrate.ts && node server/index.ts"]
