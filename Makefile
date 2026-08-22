.PHONY: build-dev
build-dev:
	docker build -f Dockerfile . \
	-t svm/node:dev

.PHONY: install
install: npm-install build-dev

.PHONY: npm-install
npm-install:
	npm install

.PHONY: up
up:
	docker-compose -f docker-compose.yml up -d

.PHONY: down
down:
	docker-compose -f docker-compose.yml down

.PHONY: list
list:
	@echo
	@cat Makefile | grep '^[a-z0-9_-]\+:' | sed 's/:.*//' | sed 's/^/  make /' | sort
	@echo

.PHONY: cleanup
cleanup:
	docker system prune -a -f --volumes