#!/bin/bash
##############################################################################
# Script developed by Wilson Ney to rename files based on regular expression
# Landmark
##############################################################################
for i in $(ls *.tif)
do
    sedc=$(echo "sed -E \
    -e 's/^([0-9]*+_[0-9]*+-[0-9]*)+([A-Za-z])+_[A-Za-z]*+_[0-9]*_(.*)$/\1 \2_\3/;s/_Top_|_TOP_//' \
#    -e 's/^([0-9]*+_[0-9]*+-[A-Za-z]+-[0-9])+([A-Za-z])+_[A-Za-z]*+_[0-9]*+[,00]+_(.*$)/\1 \2_\3/;s/_Top_|_TOP_//' \
    ")

    origf=$(echo ${i})
    c="echo \""${origf}"\" | "${sedc}
    renf=$(eval "${c}")
    cpc="cp "${origf}" "${renf}
    echo "cp "${i}" \"./RENAMED/"${renf}"\""
done
