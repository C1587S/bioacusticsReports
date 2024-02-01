import React from 'react';
import { Card } from 'react-bootstrap';
import '../styles.css'; 

const ProjectSelector = ({ selectedProject, handleProjectChange }) => {
    const projects = ["Northern Cluster Mexico", "Indonesia"];

    return (
        <Card className='simpleCard'>
            <Card.Body>
                <select
                    value={selectedProject}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    style={{ width: '50%', padding: '5px', marginLeft: '10px',opacity: '0.5' }}
                >
                    <option value="">Select project name</option>
                    {projects.map((project) => (
                        <option key={project} value={project}>
                            {project}
                        </option>
                    ))}
                </select>
            </Card.Body>
        </Card>
    );
};
export default ProjectSelector;