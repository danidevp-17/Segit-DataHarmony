#!/bin/sh
#ls *.gfx | awk '{print $1","toupper($1)",TVD,UNKNOWN"}'
# Developed by Wilson Ney - Landmark
DIST=${1}
PD_OW=${2}
IP_OW=${3}
INTERP_ID=${4}
PATHSURF="/private/wgn/users/xxx/"

for arq in $(cat gridlist)
do
    gridfile=`echo $arq | cut -d, -f1`
    gridname=`echo $arq | cut -d, -f2`
    domain=`echo $arq | cut -d, -f3`
    geoname=`echo $arq | cut -d, -f4`

# BEGIN - Build the Batch Configuration File    
echo "{" > batchconfig.diw
echo "  \"ImportFileSelector\": {" >> batchconfig.diw
echo "    \"IsClassicImport\": false," >> batchconfig.diw
echo "    \"IsClassicFaultPolygon\": false," >> batchconfig.diw
echo "    \"Data Source\": \"From Data\"," >> batchconfig.diw
echo "    \"IsClassicPointset\": false" >> batchconfig.diw
echo "  }," >> batchconfig.diw
echo "  \"Selections\": {" >> batchconfig.diw
echo "    \"IssSelected\": true," >> batchconfig.diw
echo "    \"IsAutomatic\": false," >> batchconfig.diw
echo "    \"FormatFileName\": \"/prog/ow/R5000_RH6/ow/OW_SYS_DATA/owioformats/WGN/WGN_PTS2GRID.afm.xml\"," >> batchconfig.diw
echo "    \"DataTypeName\": \"Pointset to Grid\"," >> batchconfig.diw
echo "    \"DataFileName\": \"${PATHSURF}${gridfile}\"," >> batchconfig.diw
echo "    \"NewFormat\": false" >> batchconfig.diw
echo "  }," >> batchconfig.diw
echo "  \"Parameters\": {" >> batchconfig.diw
echo "    \"variables\": {}," >> batchconfig.diw
echo "    \"parameters\": {" >> batchconfig.diw
echo "    \"PointsetToGrid.dataDomain\": \"${domain}\"," >> batchconfig.diw    
echo "    \"PointsetToGrid.znon\": \"-98765.0\"," >> batchconfig.diw
echo "    \"PointsetToGrid.geoName\": \"${geoname}\"," >> batchconfig.diw
echo "    \"PointsetToGrid.dataSource\": \"${INTERP_ID}\"," >> batchconfig.diw
echo "    \"PointsetToGrid.geoType\": \"SURFACE\"" >> batchconfig.diw
echo "    \"PointsetToGrid.attribute\": \"${gridname}\"," >> batchconfig.diw
echo "    \"PointsetToGrid.mapDataSetName\": \"${gridname}\"," >> batchconfig.diw
echo "    }" >> batchconfig.diw
echo "  }," >> batchconfig.diw
echo "  \"OptionsAndConversions\": {" >> batchconfig.diw
echo "    \"Carto\": \"ST_ED50_UTM32N_P23032_T1133\"," >> batchconfig.diw
echo "    \"MeasurementSys\": \"STATOIL Standard\"," >> batchconfig.diw
echo "    \"ImportXyInCrsUnits\": true," >> batchconfig.diw
echo "    \"PositiveImportsBelowSeaLevel\": true" >> batchconfig.diw
echo "  }" >> batchconfig.diw
echo "}" >> batchconfig.diw
# END - Build the Batch Configuration File    
   echo "Loading... "${gridfile}
   OWRuntimeLauncher.sh BatchImport batchconfig.diw -dist ${DIST} -master_prj ${PD_OW} -interp_prj ${IP_OW} -interp ${INTERP_ID}
done
