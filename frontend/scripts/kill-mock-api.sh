#!/bin/bash

# Find all uvicorn mock API server processes
PIDS=$(pgrep -f 'uvicorn mock_api.main:app')

if [ -n "$PIDS" ]; then
  echo 'Terminating mock API servers:'

  # Display ports and PIDs of servers being terminated
  lsof -Pan -p $(echo $PIDS | tr ' ' ',') -i 2>/dev/null | grep LISTEN | awk '{print "  Port " $9 " (PID " $2 ")"}' | sort -u

  # Kill the processes
  kill $PIDS && echo 'Successfully terminated all mock API servers'
else
  echo 'No mock API servers running'
fi
