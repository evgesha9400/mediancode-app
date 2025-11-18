.PHONY: help install build-css watch-css serve stop clean

help:
	@echo "Median Code Landing Page - Available Commands"
	@echo ""
	@echo "  make install     Install dependencies (npm install)"
	@echo "  make build-css   Build Tailwind CSS (minified)"
	@echo "  make watch-css   Watch for CSS changes and auto-rebuild"
	@echo "  make serve       Start local development server"
	@echo "  make stop        Stop running server on port 8000"
	@echo "  make clean       Remove built assets"
	@echo ""

install:
	npm install

build-css:
	npm run build:css

watch-css:
	npm run watch:css

serve:
	npm run serve

stop:
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@echo "Stopped any running server on port 8000"

clean:
	rm -f assets/css/styles.css
	@echo "Cleaned built CSS files"

# Default target
.DEFAULT_GOAL := help
