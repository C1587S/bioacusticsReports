import React, { useEffect, useRef } from 'react';
import { Card, CardBody, Box, Stack, StackDivider } from '@chakra-ui/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const svgMarker = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svgMarker.setAttribute('width', '20');
svgMarker.setAttribute('height', '30');
svgMarker.innerHTML = '<circle cx="15" cy="15" r="5" fill="#FEE17F" />';

mapboxgl.accessToken = 'pk.eyJ1Ijoic2NzMTU4NyIsImEiOiJjbGFoajJza3Axb3ByM3FzM254cGRydWZhIn0.kt9qP1noA6o_aEb-3ojgNA';

const FileMap = ({ fileDetails, isLoading }) => {
  const mapContainerRef = useRef(null);
  const miniMapContainerRef = useRef(null);

  useEffect(() => {
    if (fileDetails && fileDetails.latitude && fileDetails.longitude) {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        center: [fileDetails.longitude, fileDetails.latitude],
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        zoom: 7,
      });
  
      new mapboxgl.Marker({ color: '#FEE17F' }) 
        .setLngLat([fileDetails.longitude, fileDetails.latitude])
        .addTo(map);
  
      const miniMap = new mapboxgl.Map({
        container: miniMapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v9',
        center: [fileDetails.longitude, fileDetails.latitude],
        zoom: 1, 
        pitch: 0,
      });
  
      new mapboxgl.Marker({ element: svgMarker })
        .setLngLat([fileDetails.longitude, fileDetails.latitude])
        .addTo(miniMap);
  
      return () => {
        map.remove();
        miniMap.remove();
      };
    }
  }, [fileDetails]);

  return (
    <Card className="cardFileMap">
      <CardBody>
        {isLoading ? (
            <div className="loader-container">
                <div className="loader"></div>
                <div><br /><p class="white-text">Loading Map</p></div>
            </div>
        ) : (
          <>
            {fileDetails ? (
              <Stack divider={<StackDivider />} spacing='4'>
                <Box height="340px" width="100%" position="relative" bottom="10px" marginLeft="auto" marginRight="auto" justifyContent="center">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <div ref={mapContainerRef} style={{ height: '99%', width: '90%' }} />
                </div>
                <div ref={miniMapContainerRef} style={{
                    position: 'absolute',
                    bottom: '40px',
                    right: '0px',
                    width: '100px',
                    height: '100px',
                    zIndex: 10,
                    border: '4px solid #FEE17F',
                    borderRadius: '100%'
                }} /> 
                </Box>
              </Stack>
            ) : (
                <div className="container">
                <div className="prevText">
                    Select a file from the table
                </div>
                </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default FileMap;
