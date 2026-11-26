import React, { createContext, useContext, useState, useRef } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button,
  Box,
  Typography
} from '@mui/material';
import { Warning as WarningIcon, QuestionMark as QuestionIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({ title: '', message: '', confirmText: '', cancelText: '' });
  const resolver = useRef();

  const confirm = (options = {}) => {
    setConfig({
      title: options.title || t('are_you_sure'),
      message: options.message || '',
      confirmText: options.confirmText || t('confirm'),
      cancelText: options.cancelText || t('cancel')
    });
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  };

  const handleClose = (value) => {
    setOpen(false);
    if (resolver.current) resolver.current(value);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={open}
        onClose={() => handleClose(false)}
        aria-labelledby="confirm-dialog-title"
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle id="confirm-dialog-title" sx={{ pb: 1, pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              bgcolor: 'primary.soft', 
              color: 'primary.main', 
              p: 1, 
              borderRadius: 2, 
              display: 'flex',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <WarningIcon />
            </Box>
            <Typography variant="h6" fontWeight="900" sx={{ color: 'text.primary' }}>
              {config.title}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <DialogContentText sx={{ color: 'text.secondary', fontWeight: 'medium', fontSize: '0.95rem' }}>
            {config.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: 'flex-end', gap: 1 }}>
          <Button 
            onClick={() => handleClose(false)} 
            sx={{ 
              borderRadius: 2, 
              px: 3, 
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            {config.cancelText}
          </Button>
          <Button 
            onClick={() => handleClose(true)} 
            variant="contained" 
            color="primary"
            autoFocus
            sx={{ 
              borderRadius: 2, 
              px: 4, 
              boxShadow: 4,
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            {config.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
