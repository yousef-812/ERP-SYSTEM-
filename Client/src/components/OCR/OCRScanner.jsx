import React, { useState, useRef, useCallback } from 'react';
import { 
  Box, Typography, Button, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, 
  CircularProgress, Alert, Paper, Stack, 
  Divider, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import { Close, CameraAlt, Speed, Description, ContentCopy, AutoFixHigh } from '@mui/icons-material';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { useTranslation } from 'react-i18next';

const OCRScanner = ({ open, onClose, onScanComplete }) => {
  const { t } = useTranslation();
  const webcamRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const captureAndProcess = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setError(null);
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Could not capture image");

      const result = await Tesseract.recognize(
        imageSrc,
        'eng',
        { 
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(parseInt(m.progress * 100));
            }
          }
        }
      );

      setOcrResult(result.data.text);
    } catch (err) {
      setError("OCR Engine Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [webcamRef]);

  const handleUseResult = () => {
    if (onScanComplete) {
      onScanComplete(ocrResult);
    }
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth 
      PaperProps={{ 
        sx: { 
          borderRadius: 3, 
          bgcolor: 'background.paper',
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))'
        } 
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoFixHigh color="primary" />
          {t('ocr_scanner_title', 'AI Smart Scanner')}
        </Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: 'black', minHeight: 400, position: 'relative' }}>
        {!ocrResult ? (
          <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'environment' }}
              style={{ width: '100%', height: 'auto' }}
            />
            {isProcessing && (
              <Box sx={{ 
                position: 'absolute', inset: 0, 
                bgcolor: 'rgba(0,0,0,0.7)', 
                display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center',
                zIndex: 10
              }}>
                <CircularProgress variant="determinate" value={progress} size={60} />
                <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>{progress}%</Typography>
                <Typography sx={{ color: 'white', opacity: 0.8 }}>{t('processing_ocr', 'Analyzing text...')}</Typography>
              </Box>
            )}
            <Box sx={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
               <Button 
                variant="contained" 
                size="large" 
                startIcon={<CameraAlt />}
                onClick={captureAndProcess}
                disabled={isProcessing}
                sx={{ borderRadius: 10, px: 4, py: 1.5, boxShadow: 10 }}
              >
                {t('capture_scan', 'Scan Now')}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: 400 }}>
             <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
               {t('detected_text', 'DETECTED TEXT')}
             </Typography>
             <Paper variant="outlined" sx={{ p: 2, mb: 3, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
               {ocrResult}
             </Paper>
             
             <Stack direction="row" spacing={2} justifyContent="flex-end">
               <Button variant="outlined" onClick={() => setOcrResult(null)}>
                 {t('rescan', 'Scan Again')}
               </Button>
               <Button variant="contained" color="primary" startIcon={<Description />} onClick={handleUseResult}>
                 {t('use_this_text', 'Auto-populate Fields')}
               </Button>
             </Stack>
          </Box>
        )}
      </DialogContent>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }}>{error}</Alert>
      )}

      <DialogActions sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, ml: 1 }}>
          <Speed fontSize="inherit" sx={{ mr: 0.5 }} />
          {t('ocr_powered_by', 'Powered by On-Device AI Engine')}
        </Typography>
        <Button onClick={onClose} color="inherit">{t('close', 'Close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OCRScanner;
