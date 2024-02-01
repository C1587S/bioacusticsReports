import React, { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import { formatTime } from '../Utils/DateTime';
import PlayIcon from '../icons/play.png'; // Replace with the actual path to your play icon SVG
import PauseIcon from '../icons/pause.png'; // Replace with the actual path to your pause icon SVG
import ResetIcon from '../icons/reset.png';
import '../styles.css';


const SpectrogramPlayer = ({
    fileDetails, 
    isPlaying, 
    togglePlayPause, 
    resetAudio, 
    canvasRef, 
    lineCanvasRef, 
    progressBarRef, 
    handleCanvasClick, 
    audioUrl,
    audioRef,
    onAudioEnd,
    spectrogramUrl,
    isLoadingSpectrogram, 
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [currentTimeDisplay, setCurrentTimeDisplay] = useState(0);
    useEffect(() => {
        const updateDisplayTime = () => {
            if(audioRef && audioRef.current) {
                setCurrentTimeDisplay(audioRef.current.currentTime);
            }
        };

        const timeUpdateInterval = setInterval(updateDisplayTime, 1000 / 30);

        return () => {
            clearInterval(timeUpdateInterval);
        };
    }, [audioRef]);

    const freqLabels = [16384, 8192, 4096, 2048, 1024, 512, 256, 128, 64]; // Inverted and without "Hz" labels


    // Function to draw frequency ticks
    const drawFrequencyTicks = () => {
        return (
            <div className="frequency-ticks-container">
                <div className="frequency-title">Hz (log)</div>
                {freqLabels.map((freq, index) => (
                    <div
                        key={index}
                        className={`frequency-tick frequency-tick-${index}`}
                        style={{ color: '#FDFFB6' }}
                    >
                        {freq}
                    </div>
                ))}
            </div>
        );
    };
    // Function to draw spectrogram
    const drawSpectrogram = () => {
        const canvas = canvasRef.current;
        if (canvas && spectrogramUrl) {
            setIsLoading(true);  // Start loading
    
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
    
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setIsLoading(false);  // Loading finished
            };
            img.onerror = () => {
                console.error('Failed to load image at:', spectrogramUrl);
                setIsLoading(false);  // Loading finished, handle error appropriately
            };
            img.src = spectrogramUrl;
        }
    };
    

    // Function to update the progress bar and line
    const updateProgress = () => {
        const duration = audioRef.current.duration;
        const currentTime = audioRef.current.currentTime;

        if (progressBarRef.current) {
            const progressBarWidth = (currentTime / duration) * 100;
            progressBarRef.current.style.width = `${progressBarWidth}%`;
        }

        if (lineCanvasRef.current) {
            const ctx = lineCanvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, lineCanvasRef.current.width, lineCanvasRef.current.height);
            ctx.beginPath();
            const position = (currentTime / duration) * lineCanvasRef.current.width;
            ctx.moveTo(position, 0);
            ctx.lineTo(position, lineCanvasRef.current.height);
            ctx.strokeStyle = '#00FDFF';
            ctx.stroke();
        }
    };

    // Effect to draw the spectrogram when the URL changes
    useEffect(() => {
        drawSpectrogram();
    }, [spectrogramUrl]);

    // Effect to update the progress bar and line
    useEffect(() => {
        const interval = setInterval(() => {
            if (isPlaying) {
                updateProgress();
            }
        }, 1000 / 30); // Update 30 times per second

        return () => clearInterval(interval);
    }, [isPlaying]);

    return (
        <Card className="cardSpectrogram">
            <Card.Body>
                 {fileDetails && isLoadingSpectrogram ? (
                    // Spinner displayed while the spectrogram is loading
                    <div className="loader-container">
                        <div className="loader"></div>
                        <div><br /><p class="white-text">Generating Spectrogram</p></div>
                    </div>
                ) : isLoadingSpectrogram ? (
                    // Message displayed when no file is selected
                    <div className="container">
                    <div className="prevText">
                        Select a file from the table
                    </div>
                    </div>
                ) : (
                    // Spectrogram player content
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '800px' }}>
                                <div className="frequency-ticks-container">
                                    {drawFrequencyTicks()}
                                </div>
                                <canvas ref={canvasRef} width="800" height="300" style={{ border: '1px solid black', position: 'absolute' }} onClick={handleCanvasClick} />
                                <canvas ref={lineCanvasRef} width="800" height="300" style={{ border: '1px solid black', position: 'absolute' }} />
                                <div ref={progressBarRef} style={{ height: '3px', backgroundColor: '#FDFFB6', width: '0%', marginTop: '305px' }}></div>
                                <button className="play-pause-button" onClick={togglePlayPause}>
                                    {isPlaying ? <img src={PauseIcon} alt="Pause" /> : <img src={PlayIcon} alt="Play" />}
                                </button>
                                <button className="reset-button" onClick={resetAudio}>
                                    <img src={ResetIcon} alt="Reset" />
                                </button>
                                <span style={{ marginLeft: '10px', color: '#FDFFB6' }}>{formatTime(currentTimeDisplay)}</span>
                            </div>
                        </div>
                        <audio ref={audioRef} src={audioUrl} onEnded={onAudioEnd}></audio>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default SpectrogramPlayer;
