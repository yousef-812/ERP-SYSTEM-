import React, { useState } from 'react';
import { 
  IconButton, Dialog, DialogTitle, DialogContent, 
  Typography, Box, Divider, List, ListItem, 
  ListItemIcon, ListItemText, Chip, Button, 
  DialogActions, useTheme, alpha 
} from '@mui/material';
import { 
  HelpOutline, Description, PlayCircleOutline, 
  VpnKey, Security, Close, Info 
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const PageHelp = ({ helpKey }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isRtl = i18n.language === 'ar';

  const helpData = t(`help.${helpKey}`, { returnObjects: true });

  if (!helpData || typeof helpData === 'string') return null;

  return (
    <>
      <IconButton 
        onClick={() => setOpen(true)} 
        sx={{ 
          color: 'primary.main', 
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
          borderRadius: 2,
          m: 1
        }}
        title={t('help')}
      >
        <HelpOutline />
      </IconButton>

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, backgroundImage: 'none' }
        }}
      >
        <DialogTitle sx={{ 
          m: 0, p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <HelpOutline />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {t('help')} - {t(helpKey)}
            </Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} color="inherit">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          {/* About Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'primary.main' }}>
              <Description fontSize="small" />
              <Typography variant="subtitle1" fontWeight="800">
                {isRtl ? 'عن هذه الصفحة' : 'About this Page'}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {helpData.about}
            </Typography>
          </Box>

          <Divider sx={{ mb: 4, borderStyle: 'dashed' }} />

          {/* How to use section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'success.main' }}>
              <PlayCircleOutline fontSize="small" />
              <Typography variant="subtitle1" fontWeight="800">
                {isRtl ? 'كيفية الاستخدام' : 'How to Use'}
              </Typography>
            </Box>
            <List sx={{ p: 0 }}>
              {Array.isArray(helpData.how_to_use) && helpData.how_to_use.map((step, index) => (
                <ListItem key={index} sx={{ px: 0, py: 0.75 }}>
                  <ListItemIcon sx={{ minWidth: 32, color: 'success.main' }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="body2">{step}</Typography>} />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ mb: 4, borderStyle: 'dashed' }} />

          {/* Permissions Section */}
          <Box sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.warning.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.1) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'warning.main' }}>
              <Security fontSize="small" />
              <Typography variant="subtitle1" fontWeight="800">
                {isRtl ? 'صلاحيات الوصول والتحكم' : 'Access & Permissions'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>
                {isRtl ? 'من يمكنه الوصول:' : 'Who can access:'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip icon={<VpnKey sx={{ fontSize: '14px !important' }} />} label={helpData.access} size="small" variant="outlined" color="warning" />
                <Chip label={helpData.permissions_required} size="small" variant="soft" color="warning" sx={{ fontWeight: 'bold' }} />
              </Box>
            </Box>

            {helpData.action_permissions && (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>
                  {isRtl ? 'صلاحيات الأوامر المحددة:' : 'Action-specific Permissions:'}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {helpData.action_permissions.map((action, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'background.paper' }}>
                      <Typography variant="body2" fontWeight="700">{action.action}</Typography>
                      <Chip label={action.perm} size="small" sx={{ fontSize: 10, bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main', fontWeight: 'bold' }} />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <Button onClick={() => setOpen(false)} variant="contained" sx={{ borderRadius: 2, px: 4 }}>
            {isRtl ? 'فهمت ذلك' : 'Got it'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PageHelp;

const Avatar = ({ children, sx }) => {
  const theme = useTheme();
  return (
    <Box sx={{ 
      width: 40, height: 40, 
      borderRadius: 2, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      ...sx 
    }}>
      {children}
    </Box>
  );
};
