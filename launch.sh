#!/bin/bash

cd ~/goProjects/diploma || exit 1

(
    echo "Starting frontend..."
    cd frontend || exit
    npm run dev
) &

(
    echo "Starting Go API Server..."
    cd go-server || exit
    go run cmd/main.go
) &

(
    echo "Starting Python Analysis Server..."
    source venv/bin/activate
    cd python-server || exit
    python3 main.py
) &

wait
echo "All services started successfully"