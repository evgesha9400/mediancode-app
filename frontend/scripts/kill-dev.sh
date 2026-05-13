#!/bin/bash

# Find all vite dev server processes
PIDS=$(pgrep -f 'vite dev')

if [ -n "$PIDS" ]; then
  echo 'Terminating dev servers:'

  # Display ports and PIDs of servers being terminated
  lsof -Pan -p $(echo $PIDS | tr ' ' ',') -i 2>/dev/null | grep LISTEN | awk '{print "  Port " $9 " (PID " $2 ")"}' | sort -u

  # Kill the processes
  kill $PIDS && echo 'Successfully terminated all dev servers'
else
  echo 'No dev servers running'
fi
