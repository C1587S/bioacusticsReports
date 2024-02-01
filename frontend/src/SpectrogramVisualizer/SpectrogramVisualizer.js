import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Switch, Link } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import ProjectSelector from './ProjectSelector';
import FilesTable from './FilesTable';
import FileDetails from './FileDetails';
import FileMap from './FileMap';
import beLogo from '../imgs/be_logo_1.png';
import SpectrogramPlayer from './SpectrogramPlayer';
import DetectionInfoCard from './DetectionInfoCard';
import Papa from 'papaparse';
import '../styles.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { convertTimestampsToSeconds } from '../Utils/DateTime';
import DOMPurify from 'dompurify';
import speciesInfo from '../species_info/taxonomic_info.json';
import { getSpeciesSilhouette, changeSilhouetteColor }  from '../Utils/SpeciesProperties';

export default function SpectrogramVisualizer(props) {
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const [mounted, setMounted] = useState(false);
  const [gridWidth, setGridWidth] = useState(window.innerWidth);
  const [selectedProject, setSelectedProject] = useState('');
  const [initialWidth, setInitialWidth] = useState(window.innerWidth);
  const [projectData, setProjectData] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileDetails, setFileDetails] = useState(null); 
  const [isFileDetailsLoading, setIsFileDetailsLoading] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [projectID, setprojectID] = useState(false);
// State and refs for SpectrogramPlayer
   const [isPlaying, setIsPlaying] = useState(false);
   const audioRef = useRef(null);
   const canvasRef = useRef(null);
   const lineCanvasRef = useRef(null);
   const progressBarRef = useRef(null);
   const [spectrogramUrl, setSpectrogramUrl] = useState('');
   const [audioUrl, setAudioUrl] = useState('');
   const [currentTimeDisplay, setCurrentTimeDisplay] = useState(0);
   const [detectionData, setDetectionData] = useState([]);
   const [convertedData, setconvertedData] = useState([]);
   const [taxonomicInfo, setSpeciesInfo] = useState({});
   const [displayText, setDisplayText] = useState('');
   const [isLoadingSpectrogram, setIsLoadingSpectrogram] = useState(true); 
   const [silhouetteUrls, setSilhouetteUrls] = useState({});
   const [lastSilhouetteUpdateTime, setLastSilhouetteUpdateTime] = useState(0);


   const initialLayout = [
    {"w": 2, "h": 23, "x": 0,"y": 0, "i": "a", "moved": false, "static": true},
    {"w": 4, "h": 3, "x": 2, "y": 0, "i": "b", "moved": false, "static": true},
    {"w": 5, "h": 3, "x": 6, "y": 0, "i": "c", "moved": false, "static": true},
    {"w": 5, "h": 5, "x": 2, "y": 3, "i": "d", "moved": false, "static": true},
    {"w": 5, "h": 4, "x": 2, "y": 8, "i": "e", "moved": false, "static": true},
    {"w": 4, "h": 9, "x": 7, "y": 3, "i": "f", "moved": false, "static": true},
    {"w": 2, "h": 11, "x": 9, "y": 12, "i": "g", "moved": false, "static": true},
    {"w": 7, "h": 11, "x": 2, "y": 12, "i": "h", "moved": false, "static": true}
  ];
   const spectrogramIndex = 7;

   const [layout, setLayout] = useState(initialLayout);

   const fetchSpectrogramAndAudioData = async (fileDetails, detectionData) => {
        try {
            setIsLoadingSpectrogram(true); // Activate loading spinner
            const response = await fetch(`${backendUrl}/generate_spectrogram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project: selectedProject,
                    fileName: fileDetails.name,
                    obsData: detectionData,
                    url: fileDetails.url
                }),
            });

            const data = await response.json();            
            if (response.ok) {
                const fullAudioUrl = `${backendUrl}${data.audioUrl}`;
                const modifiedAudioUrl = fullAudioUrl.replace("s3:/", "/shared_volume_s3fs");
                setSpectrogramUrl(data.spectrogramUrl);
                setAudioUrl(modifiedAudioUrl);
                setDetectionData(data.detectionData);
            } else {
                console.error('Error fetching spectrogram and audio:', data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoadingSpectrogram(false); // Deactivate loading spinner regardless of success/error
        }
    };
    // Function to fetch detection details and spectrogram
    const fetchDetectionDetails = async (fileId, fileData) => {
        try {
            const response = await fetch(`${backendUrl}/get_detection_details?file_id=${fileId}`);
            const detectionData = await response.json();
            
            const convertedData = convertTimestampsToSeconds(detectionData);
            setconvertedData(convertedData);
            // Fetch spectrogram and audio data
            await updateSilhouetteUrls();
            fetchSpectrogramAndAudioData(fileData, convertedData);
        } catch (error) {
            console.error('Error fetching detection details:', error);
        }
    }
    async function updateSilhouetteUrls() {
      // Filter for detections that need new silhouette URLs
      const detectionsNeedingSilhouettes = convertedData.filter(detection => {
          const speciesData = speciesInfo[detection.taxon_id];
          const speciesName = speciesData ? speciesData.species : 'Unknown';
          // Check if this species's silhouette URL is not already fetched
          return !silhouetteUrls[detection.taxon_id];
      });
  
      // Fetch silhouette URLs for these detections
      const silhouettePromises = detectionsNeedingSilhouettes.map(async detection => {
          const speciesData = speciesInfo[detection.taxon_id];
          const speciesName = speciesData ? speciesData.species : 'Unknown';
          return [detection.taxon_id, await getSpeciesSilhouette(speciesName)];
      });
  
      // Resolve promises and update the silhouetteUrls state
      const results = await Promise.all(silhouettePromises);
      const newSilhouetteUrls = Object.fromEntries(results);
      setSilhouetteUrls(urls => ({ ...urls, ...newSilhouetteUrls }));
  }
    // Function to update the info display with current detections
    async function updateInfoDisplay() {
      const currentTime = audioRef.current ? audioRef.current.currentTime : 0;
      const detectionsInRange = convertedData.filter(detection => 
          currentTime >= detection.start_time && currentTime <= detection.end_time
      );
  
      // Filter for highest confidence per taxon_id
      const highestConfidenceDetections = detectionsInRange.reduce((acc, detection) => {
          if (!acc[detection.taxon_id] || acc[detection.taxon_id].confidence < detection.confidence) {
              acc[detection.taxon_id] = detection;
          }
          return acc;
      }, {});
  
      if (Object.keys(highestConfidenceDetections).length > 0) {
          const displayTextPromises = Object.values(highestConfidenceDetections).map(async (detection) => {
              const speciesData = speciesInfo[detection.taxon_id];
              const speciesName = speciesData ? speciesData.species : 'Unknown';
              const silhouetteUrl = silhouetteUrls[detection.taxon_id]; // Get URL from silhouetteUrls state
              console.log(silhouetteUrl)
              if (silhouetteUrl) {
                return `<div style="text-align: left;">
                    <strong>Species:</strong> ${speciesName}<br>
                    <strong>Confidence:</strong> ${detection.confidence.toFixed(2)}<br>
                    <strong>Time Range:</strong> ${detection.start_time}-${detection.end_time} seconds
                    </div>
                    <div style="display: block; text-align: right;">
                    <img src="${silhouetteUrl}" alt="Silhouette" style="width: 50px; height: auto; margin-top: 2px; margin-bottom: -1px; margin-left: 10px; margin-right: 7px;">
                  </div>
                </div>`;
            } else {
                return `<div>
                    <strong>Species:</strong> ${speciesName}<br>
                    <strong>Confidence:</strong> ${detection.confidence.toFixed(2)}<br>
                    <strong>Time Range:</strong> ${detection.start_time}-${detection.end_time} seconds
                </div>`;
            }
          });
          Promise.all(displayTextPromises).then(displayTexts => {
              const newDisplayText = displayTexts.join('<div style="margin-top: 10px; border-bottom: 1px dotted #000;"></div>');
              setDisplayText(DOMPurify.sanitize(newDisplayText));
          });
      }
  }
    const togglePlayPause = () => {
        const audio = audioRef.current;
        const isAudioPlaying = !audio.paused && !audio.ended && audio.readyState > 2;

        if (isAudioPlaying) {
            audio.pause();
        } else {
            audio.play();
        }

        setIsPlaying(!isPlaying);
    };

    const resetAudio = () => {
        const audio = audioRef.current;
        
        // Pause the audio if it's playing
        if (!audio.paused) {
            audio.pause();
            setIsPlaying(false);
        }

        // Reset the audio's current time
        audio.currentTime = 0;
        setCurrentTimeDisplay(0);

        // Clear the line on the spectrogram canvas
        const lineCtx = lineCanvasRef.current.getContext('2d');
        lineCtx.clearRect(0, 0, lineCanvasRef.current.width, lineCanvasRef.current.height);

        // Reset the progress bar width
        if (progressBarRef.current) {
            progressBarRef.current.style.width = '0%';
        }
    };
    const handleCanvasClick = (event) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const duration = audioRef.current.duration;
        const clickedTime = (x / canvas.width) * duration;
        audioRef.current.currentTime = clickedTime;
    };
    const onAudioEnd = () => {
        setIsPlaying(false);
    };

    useEffect(() => {
      let interval;
      if (isPlaying) {
        interval = setInterval(() => {
          updateInfoDisplay();  // Updates display including silhouettes
        }, 1000 / 30); // Update 30 times per second
      }
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [isPlaying, detectionData, silhouetteUrls]);

  useEffect(() => {
    let silhouetteInterval;
    if (isPlaying) {
      silhouetteInterval = setInterval(() => {
        updateSilhouetteUrls(); // Update silhouette URLs
      }, 1000); // Check every 3 seconds
    }
    return () => {
      if (silhouetteInterval) clearInterval(silhouetteInterval);
    };
  }, [isPlaying, convertedData]);

    useEffect(() => {
        setInitialWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        handleResize();
        setMounted(true);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

  useEffect(() => { 
    if (selectedProject) {
      setIsLoading(true); //
      fetch(`${backendUrl}/get_top_files?project=${encodeURIComponent(selectedProject)}`)
        .then(response => response.json())
        .then(data => {
          setProjectData(data);
          setIsLoading(false); // 
        })
        .catch(error => {
          console.error('Error fetching project data:', error);
          setIsLoading(false); // 
        });
    } else {
      setProjectData([]);
    }
  }, [selectedProject]);
    // Additional useEffect for audio play progress...
    useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
        const currentTime = audioRef.current.currentTime;
        setCurrentTimeDisplay(currentTime);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
}, [audioRef]); 


  const handleResize = () => {
    const newWidth = window.innerWidth;
    if (newWidth > initialWidth) {
      setGridWidth(newWidth);
    }
  };

  const onLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  const handleProjectChange = (project) => {
    setSelectedProject(project);
  };

  const handleRowClick = async (fileId) => {
    if (fileId !== selectedFileId) {
        // Reset states for new file selection
        setSelectedFileId(fileId);
        setFileDetails(null);
        setIsFileDetailsLoading(true);
        setIsMapLoading(true);
        setSpectrogramUrl('');
        setAudioUrl('');
        setIsPlaying(false);
        setCurrentTimeDisplay(0);
        setIsLoadingSpectrogram(true);

        setDetectionData([]); // Reset detection data
        setconvertedData([]); // Reset converted detection data
        setDisplayText(''); 
        try {
            // Fetching file details
            const response = await fetch(`${backendUrl}/get_file_details?file_id=${fileId}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const fileData = await response.json();
            setFileDetails(fileData);
            fetchDetectionDetails(fileId, fileData);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsFileDetailsLoading(false);
            setIsMapLoading(false);
        }
    }
};

  const columns = 12;
  const headerTitles = [
    "Views",
    "Project",
    "",
    "Top 100 detection Files",
    "File Details",
    "Device Location",
    "Detections",
    "",
  ];

  const top100DetectionFilesIndex = 3; 

  return (
    <div>
      <div className="align-right transparent-background" style={{ position: 'absolute', top: 0, right: 0 }}>
        <img src={beLogo} alt="Be Logo" style={{ width: '300px', height: '100%' }} />
      </div>
      <GridLayout
        className="layout"
        layout={layout}
        cols={columns}
        rowHeight={30}
        width={gridWidth}
        onLayoutChange={onLayoutChange}
        useCSSTransforms={mounted}
      >
        {layout.map((itm, index) => {
          // Determine whether to apply the class based on the index
          const shouldApplyClass = index === spectrogramIndex || index === 2;
  
          return (
            <div
              key={itm.i}
              data-grid={itm}
              className={`block ${shouldApplyClass ? 'grid-no-header' : ''} ${shouldApplyClass ? 'rounded-grid' : ''}`} // Conditionally add the class
            >
              <div className="grid-header">
                {index < headerTitles.length ? headerTitles[index] : "No header"}
              </div>
              {index === 0 && (
                <Router>
                  <nav>
                    <ul className="nav-links">
                      <li><Link to="/DetectionSepectrograms">Detection Spectrograms</Link></li>
                      <li><Link to="/TaxonomicTrees">Taxonomic Trees</Link></li>
                      <li><Link to="/ActivityPlots">Activity Plots</Link></li>
                    </ul>
                  </nav>
                  <Switch>
                    {/* <Route path="/Dashboard">
                      <Dashboard />
                    </Route>
                    <Route path="/TaxonomicTrees">
                      <TaxonomicTrees />
                    </Route>
                    <Route path="/ActivityPlots">
                      <ActivityPlots />
                    </Route> */}
                  </Switch>
                </Router>
              )}
              {index === 1 && (
                <ProjectSelector
                  selectedProject={selectedProject}
                  handleProjectChange={handleProjectChange}
                />
              )}
              {index === top100DetectionFilesIndex && (
                <FilesTable
                  projectData={projectData}
                  selectedRowId={selectedFileId}
                  handleRowClick={handleRowClick}
                  isLoading={isLoading}
                />
              )}
              {headerTitles[index] === "File Details" && (
                <FileDetails
                  fileDetails={fileDetails}
                  isLoading={isFileDetailsLoading}
                />
              )}
              {headerTitles[index] === "Device Location" && (
                  <FileMap fileDetails={fileDetails} isLoading={isMapLoading} />
              )}
              {index === spectrogramIndex && (
                <SpectrogramPlayer
                  fileDetails={fileDetails}
                  isPlaying={isPlaying}
                  togglePlayPause={togglePlayPause}
                  resetAudio={resetAudio}
                  canvasRef={canvasRef}
                  lineCanvasRef={lineCanvasRef}
                  progressBarRef={progressBarRef}
                  handleCanvasClick={handleCanvasClick}
                  audioUrl={audioUrl}
                  audioRef={audioRef}
                  onAudioEnd={onAudioEnd}
                  spectrogramUrl={spectrogramUrl}
                  isLoadingSpectrogram={isLoadingSpectrogram} 
                />
              )}
              {headerTitles[index] === "Detections" && (
                <DetectionInfoCard displayText={displayText} />
              )}
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}

{/* <div>
<h2>Updated Layout</h2>
<pre>{JSON.stringify(layout, null, 2)}</pre>
</div> */}
    