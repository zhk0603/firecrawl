FROM firecrawl:api-base AS base
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

RUN pnpm config set registry https://registry.npmmirror.com
RUN pnpm install
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    bash -c 'export SENTRY_AUTH_TOKEN="$(cat /run/secrets/SENTRY_AUTH_TOKEN)"; if [ -z $SENTRY_AUTH_TOKEN ]; then pnpm run build:nosentry; else pnpm run build; fi'

# Install packages needed for deployment

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 8080
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"
