COMPOSE      = docker compose
COMPOSE_DEV  = $(COMPOSE) --profile development
COMPOSE_PROD = $(COMPOSE) --profile production

up-dev:
	$(COMPOSE_DEV) up -d

up-dev-build:
	$(COMPOSE_DEV) up --build -d

up-prod:
	$(COMPOSE_PROD) up -d

up-prod-build:
	$(COMPOSE_PROD) up --build -d

down:
	$(COMPOSE) down

down-v:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps
