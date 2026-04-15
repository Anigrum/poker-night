#!/bin/bash

# Open a terminal window for the backend server
osascript -e 'tell app "Terminal" to do script "echo Starting backend... && cd /Users/adamrotman/PycharmProjects/PokerOrganizer/backend && /Users/adamrotman/PycharmProjects/PokerOrganizer/.venv/bin/uvicorn main:app --reload"'

# Give the backend a moment to start
sleep 3

# Open a terminal window for the frontend server
osascript -e 'tell app "Terminal" to do script "echo Starting frontend... && cd /Users/adamrotman/PycharmProjects/PokerOrganizer/frontend && npm run dev"'

# Give the frontend a moment to start
sleep 4

# Open the app in the browser
open http://localhost:5173
