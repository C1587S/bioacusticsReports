import React from 'react';
import { Card, CardBody, Box, Stack, StackDivider } from '@chakra-ui/react';

const DetectionInfoCard = ({ displayText }) => {
    return (
        <Card className="cardDetections">
            <CardBody>
                <Stack divider={<StackDivider />} spacing='4'>
                    <Box dangerouslySetInnerHTML={{ __html: displayText }} />
                </Stack>
            </CardBody>
        </Card>
    );
};

export default DetectionInfoCard;
