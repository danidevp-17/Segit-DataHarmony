#!/bin/sh
for arq in $(ls fault*)
do
   awk '{faultname=ARGV[1];print $0"    "faultname}' $arq
done
