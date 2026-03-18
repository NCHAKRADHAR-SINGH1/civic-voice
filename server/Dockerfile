FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts
COPY setup-admin.js ./setup-admin.js
COPY setup-owner.js ./setup-owner.js

ENV NODE_ENV=production
EXPOSE 5000

CMD ["sh", "-c", "npm run prisma:deploy && npm start"]