#!/bin/bash
# Run script for WCCSA Community Directory Management Tool

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Please run ./setup.sh first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Run the application
python3 app.py


