FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build


FROM node:22-alpine AS runtime
WORKDIR /app

RUN corepack enable && \
    addgroup -S app && adduser -S app -G app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

USER app
EXPOSE 4000

CMD ["node", "dist/index.js"]
