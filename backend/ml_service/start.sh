#!/usr/bin/env bash
# Install deps (first time only) then start the ML service
set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python -m venv .venv
fi

source .venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt --quiet

echo "Starting Size Recommendation ML Service on port 8001..."
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
