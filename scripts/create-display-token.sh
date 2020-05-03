#!/bin/sh
mkdir -p "$1"
passfile=$(mktemp -p $1)
echo "$2: localhost:$3" >> $passfile
echo $passfile
