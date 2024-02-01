import React from 'react';
import { Card, CardBody } from '@chakra-ui/react';
import { formatDatetimeToUTC, formatDatetime, formatDate } from '../Utils/DateTime';
import '../styles.css';

const FileDetails = ({ fileDetails, isLoading }) => {
  return (
        <Card className="simpleCardFileDetails">
        <CardBody>
            {isLoading ? (
            <div className="loader-container">
                <div className="loader"></div>
                <div><br /><p class="white-text">Loading File Details</p></div>
            </div>
            ) : (
            fileDetails ? (
                <div>
                <p><strong>Name:</strong> {fileDetails.name}</p>
                <p><strong>Ecosystem:</strong> {fileDetails.ecosystem_name}</p>
                <p><strong>Date:</strong> {formatDate(fileDetails.datetime)}</p>
                <p><strong>UTC Time:</strong> {formatDatetimeToUTC(fileDetails.datetime)}</p>
                <p><strong>Local Time:</strong> {formatDatetime(fileDetails.datetime)}</p>
                </div>
            ) : (
                <div className="container">
                <div className="prevText">
                    Select a file from the table
                </div>
                </div>
            )
            )}
        </CardBody>
        </Card>
  );
};

export default FileDetails;