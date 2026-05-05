FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
ARG NODE_ENV=development
COPY tsconfig.json ./
COPY src ./src
RUN if [ "$NODE_ENV" = "production" ]; then pnpm build; else mkdir -p dist; fi

FROM base AS runner
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

COPY package.json pnpm-lock.yaml ./
RUN if [ "$NODE_ENV" = "production" ]; \
    then pnpm install --frozen-lockfile --prod; \
    else pnpm install --frozen-lockfile; \
    fi

COPY --from=builder /app/dist ./dist
COPY src ./src
COPY tsconfig.json ./

EXPOSE 4000

CMD if [ "$NODE_ENV" = "development" ]; \
    then pnpm dev; \
    else node dist/index.js; \
    fi
