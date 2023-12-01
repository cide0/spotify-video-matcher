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