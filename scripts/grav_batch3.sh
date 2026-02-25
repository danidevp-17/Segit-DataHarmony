#!/bin/sh
####################################################################################################
# Routine to optimize the gravity data loading in batch mode as OW Pointsets
# Developed by Wilson Ney - Landmark
# Version Nov.25
# To run:
# To run: ./grav_batch.sh COURSE DSG_NORWAY_83 ALL_DATA WGN planilha WGN_GRAV_BATCH2
# To run: ./grav_batch.sh NSEA_BG TROLL_AREA ALL_DATA LGC <pointset_name_OW>
####################################################################################################
DIST=${1}
PD_OW=${2}
IP_OW=${3}
INTERP_ID=${4}
PTS_NAME=${5}
PWD="/private/wgn/users/vivek/V2/"
#PWD="/private/wgn/users/vivek/All_files/all2/"
DIW="/private/wgn/Landmark/OpenWorks/Loaders/BatchConfig/chara_grav.diw"
for f in $(ls -d ${PWD}*.txt)
do 
    GRAV_DATA=${f} # "/private/wgn/users/vivek/gravd.txt"
    echo ${GRAV_DATA}
    arqpts=`echo $(basename ${f})`
    nampts=`echo $(basename ${f}) | cut -d"." -f1`    
    echo ${arqpts}
    echo ${nampts}
    for i in {1..2}
    do
        sed -i "s/,/./g" ${GRAV_DATA}_TEMP
        if [ "$i" -eq 1 ]; then
            cat ${GRAV_DATA} | tail -n +2 | grep -v "\-99999" | awk '{if ($6>=0) print $0}' > ${GRAV_DATA}_TEMP
	    flag="POS"
	    pts=${PTS_NAME}_${flag}
	    diwflag=${DIW}"_POS"
        else
            cat ${GRAV_DATA} | tail -n +2 | grep -v "\-99999" | awk '{if ($6<0) print $0}' > ${GRAV_DATA}_TEMP
	    sed -i "s/-//g" ${GRAV_DATA}_TEMP
     	    flag="NEG"
	    pts=${PTS_NAME}_${flag}
	    diwflag=${DIW}"_NEG"
        fi
	sed "s|DATA_FILE_NAME_TO_CHANGE|${GRAV_DATA}_TEMP|g;s|POINTSET_NAME_TO_CHANGE|${nampts}_${flag}|g" ${DIW} > ${diwflag} 
#       OWRuntimeLauncher.sh BatchImport ${diwflag} -dist ${DIST} -master_prj ${PD_OW} -interp_prj ${IP_OW} -INTERP ${INTERP_ID}
        OWRuntimeLauncher.sh BatchImport ${diwflag} -dist ${DIST} -master_prj ${PD_OW} -interp_prj ${IP_OW} -INTERP ${INTERP_ID}
    done
done
