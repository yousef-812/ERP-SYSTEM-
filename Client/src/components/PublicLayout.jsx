import React from 'react';
import { Box } from '@mui/material';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

const PublicLayout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <PublicNavbar />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <PublicFooter />
    </Box>
  );
};

export default PublicLayout;
