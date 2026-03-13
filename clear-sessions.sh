#!/bin/bash
# clear-sessions.sh — Wipe stored CECI session history from the browser's localStorage.
# Opens the React app with ?clearSessions=1 which triggers the clear on load.

URL="http://localhost:3002/?clearSessions=1"

echo "Clearing CECI session history..."
echo "Opening: $URL"

# Try common Linux browser launchers
if command -v xdg-open &> /dev/null; then
    xdg-open "$URL"
elif command -v google-chrome &> /dev/null; then
    google-chrome "$URL"
elif command -v chromium-browser &> /dev/null; then
    chromium-browser "$URL"
elif command -v firefox &> /dev/null; then
    firefox "$URL"
else
    echo ""
    echo "Could not detect a browser. Please open this URL manually:"
    echo "  $URL"
    echo ""
    echo "Or, in the app's Results page, click the 'Clear History' button."
    exit 1
fi

echo "Done. Session history has been cleared — reload the app to start fresh."
