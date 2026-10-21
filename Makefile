# Рецепты вызывают только npm и docker: так Makefile одинаково работает
# в PowerShell (cmd.exe), Git Bash и в CI на Ubuntu.

IMAGE = call-calendar

.PHONY: setup dev test lint lint-fix build check docker-build docker-run

setup: ## установить зависимости
	npm install

dev: ## бекенд (:3000) + фронтенд (:5173) в режиме разработки
	npm run dev

test: ## все тесты
	npm test

lint: ## oxlint + проверка форматирования
	npm run lint

lint-fix: ## автоисправление линтера и форматирование
	npm run lint:fix

build: ## сборка бекенда и фронтенда
	npm run build

check: lint test build ## всё, что гоняет CI

docker-build: ## собрать Docker-образ
	docker build -t $(IMAGE) .

docker-run: ## запустить образ на http://localhost:3000
	docker run --rm --name $(IMAGE) -p 3000:3000 $(IMAGE)
