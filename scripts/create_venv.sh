#!/bin/bash

echo "======================================"
echo "    AI Shelter Virtual Environment Setup"
echo "======================================"

echo "Creating virtual environment..."
cd ..
python3 -m venv .venv

if [ $? -ne 0 ]; then
    echo "Failed to create virtual environment"
    exit 1
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "======================================"
echo "Virtual environment setup complete!"
echo "To activate: source .venv/bin/activate"
echo "======================================"