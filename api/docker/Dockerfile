FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache wget && corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN chmod +x ./docker/docker-entrypoint.sh

EXPOSE 4000

CMD ["sh", "./docker/docker-entrypoint.sh"]
