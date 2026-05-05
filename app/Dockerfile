FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
# Domyślnie ustawiamy development, żeby budowanie było szybkie
ARG NODE_ENV=development
COPY . .
RUN if [ "$NODE_ENV" = "production" ]; then \
      pnpm build; \
    else \
      mkdir -p .next/standalone .next/static; \
    fi

FROM base AS runner
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

COPY package.json pnpm-lock.yaml ./
RUN if [ "$NODE_ENV" = "production" ]; \
    then pnpm install --frozen-lockfile --prod; \
    else pnpm install --frozen-lockfile; \
    fi

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY . .

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD if [ "$NODE_ENV" = "development" ]; \
    then pnpm dev; \
    else node server.js; \
    fi
