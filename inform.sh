#!/bin/bash
for f in images/* ; do
  echo "$f"; identify -verbose "$f" | grep -E ':GPS(Latitude|Longitude):'
done | awk '/images/{print "";printf $0}/^ /{printf $0}' | cat
