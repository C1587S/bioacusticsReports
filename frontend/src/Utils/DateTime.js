// datetimeUtils.js

// Formats a datetime string to UTC time
export const formatDatetimeToUTC = (datetimeString) => {
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' };
    const date = new Date(datetimeString);
    return date.toLocaleTimeString('en-US', options);
};

// Formats a datetime string with time and timezone name
export const formatDatetime = (datetimeString) => {
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
    const date = new Date(datetimeString);
    return date.toLocaleTimeString('en-US', options);
};

// Formats a datetime string to a short date format
export const formatDate = (datetimeString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const date = new Date(datetimeString);
    return date.toLocaleDateString('en-US', options);
};

// Converts timestamps in detections data to seconds
export const convertTimestampsToSeconds = (data) => {
    return data.map((detection) => {
        const startTime = new Date(detection.start_time);
        const endTime = new Date(detection.end_time);

        return {
            ...detection,
            start_time: startTime.getSeconds(),
            end_time: endTime.getSeconds(),
        };
    });
};

// Formats seconds to minutes:seconds with two decimal places
export const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedSeconds = remainingSeconds.toFixed(2); // Keep only two decimal places
    return `${minutes}:${formattedSeconds.padStart(5, '0')}`;
};
