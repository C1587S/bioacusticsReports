import React from 'react';
import { Card, Table } from 'react-bootstrap';
import '../styles.css';

const FilesTable = ({ projectData, selectedRowId, handleRowClick, isLoading }) => {
    return (
        <Card className="simpleCardFilesTable">
            <Card.Body style={{ minHeight: '200px' }}>
                {/* Display loader while loading */}
                {isLoading ? (
                    <div className="loader-container">
                        <div className="loader"></div>
                        <div><br /><p class="white-text">Loading Files Table</p></div>
                    </div>
                    
                ) : projectData.length > 0 ? (
                    // Display the table if projectData is available
                    <div className="table-container">
                        <Table striped bordered hover variant="dark" className="files-table">
                            <thead>
                                <tr>
                                    <th>File ID</th>
                                    <th>Observations</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectData.map((file) => (
                                    <tr
                                        key={file.file_id}
                                        onClick={() => handleRowClick(file.file_id)}
                                        className={selectedRowId === file.file_id ? 'selected-row' : ''}
                                    >
                                        <td>{file.file_id}</td>
                                        <td>{file.num_observations}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                ) : (
                    // Display a message when no project is selected
                    <div className="container">
                        <div className="prevText">Select a project from the dropdown</div>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default FilesTable;
