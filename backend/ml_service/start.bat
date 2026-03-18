@echo off
cd /d "%~dp0"

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip --quiet

echo Installing dependencies...
pip install -r requirements.txt --quiet

echo Starting Size Recommendation ML Service on port 8001...
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
