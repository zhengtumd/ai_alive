@echo off
chcp 65001 > nul

echo ======================================
echo    AI Shelter Virtual Environment Setup
echo ======================================

echo Creating virtual environment...
cd /d %~dp0..
python -m venv .venv

if %errorlevel% neq 0 (
    echo Failed to create virtual environment
    pause
    exit /b 1
)

echo Activating virtual environment...
call .venv\Scripts\activate

echo Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo ======================================
echo Virtual environment setup complete!
echo To activate: call .venv\Scripts\activate
echo ======================================
pause