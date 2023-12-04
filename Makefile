.PHONY: build_dev
build_dev:
	docker build -f Dockerfile . \
	-t svm/node:dev

.PHONY: run
run:
	docker-compose -f docker-compose.yml up -d

.PHONY: stop
stop:
	docker-compose -f docker-compose.yml down

.PHONY: pull
pull:
	@echo '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'
	git pull origin main

.PHONY: list
list:
	@echo
	@cat Makefile | grep '^[a-z0-9_-]\+:' | sed 's/:.*//' | sed 's/^/  make /' | sort
	@echo

.PHONY: cleanup
cleanup:
	docker system prune -a -f --volumes