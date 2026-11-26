import React, { useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton, 
  Typography, 
  Box, 
  useTheme 
} from '@mui/material';
import { Close as CloseIcon, CameraAlt as CameraIcon } from '@mui/icons-material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';

/**
 * BarcodeScanner Component
 * @param {boolean} open - Dialog open state
 * @param {function} onClose - Function to close the dialog
 * @param {function} onScan - Callback function when a barcode is scanned. (decodedText, decodedResult)
 * @param {string} title - Dialog title
 */
const BarcodeScanner = ({ open, onClose, onScan, title }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const scannerId = "barcode-scanner-region";

  useEffect(() => {
    let html5QrcodeScanner = null;

    if (open) {
      // Use a small timeout to ensure the DOM element is rendered 
      // within the MUI Dialog before initializing the scanner
      const timer = setTimeout(() => {
        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        try {
          html5QrcodeScanner = new Html5QrcodeScanner(scannerId, config, false);
          html5QrcodeScanner.render((decodedText, decodedResult) => {
            onScan(decodedText, decodedResult);
          }, (errorMessage) => {
            // console.warn(errorMessage);
          });
        } catch (err) {
          console.error("Scanner initialization failed", err);
        }
      }, 300); // 300ms is usually enough for Dialog transition

      return () => {
        clearTimeout(timer);
        if (html5QrcodeScanner) {
          html5QrcodeScanner.clear().catch(error => {
            console.error("Failed to clear html5QrcodeScanner", error);
          });
        }
      };
    }
  }, [open, onScan]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4, overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraIcon />
          <Typography variant="h6" fontWeight="bold">
            {title || t('scan_barcode')}
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, bgcolor: '#000' }}>
        <Box 
          id={scannerId} 
          sx={{ 
            width: '100%',
            '& #html5-qrcode-button-camera-start, & #html5-qrcode-button-camera-stop': {
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              margin: '10px'
            },
            '& #html5-qrcode-anchor-scan-type-change': {
              color: 'white',
              textDecoration: 'none',
              fontSize: '12px'
            },
            '& select': {
                padding: '8px',
                borderRadius: '4px',
                margin: '10px'
            }
          }}
        />
      </DialogContent>
      
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
         <Typography variant="caption" color="text.secondary" fontWeight="bold">
            {t('scanner_hint')}
         </Typography>
      </Box>
    </Dialog>
  );
};

export default BarcodeScanner;
