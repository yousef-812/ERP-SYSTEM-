import React, { useState, useEffect } from 'react';
import { 
  Badge, IconButton, Popover, List, ListItem, 
  ListItemText, Typography, Divider, Box, Button,
  ListItemIcon, Avatar, Chip, Tooltip, ListItemButton
} from '@mui/material';
import { 
  Notifications, Warning, Error as ErrorIcon, 
  Inventory, History, AddCircle, Edit as EditIcon, 
  Delete as DeleteIcon, Login as LoginIcon, DoneAll
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import axios from 'axios';
import { API_URLS } from '../api';

const NotificationBell = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const dateLocale = i18n.language === 'ar' ? ar : enUS;
  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(API_URLS.NOTIFICATIONS);
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleReadAll = async () => {
    try {
      await axios.post(`${API_URLS.NOTIFICATIONS}/read-all`);
      fetchNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleMarkAsRead = async (id, link) => {
    try {
      await axios.post(`${API_URLS.NOTIFICATIONS}/${id}/read`);
      if (link) navigate(link);
      handleClose();
      fetchNotifications();
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const getSeverityIcon = (severity, type) => {
    if (type === 2) return <Inventory sx={{ color: 'warning.main' }} />; // Inventory
    if (type === 1) return <History sx={{ color: 'info.main' }} />; // Workflow
    
    switch (severity) {
      case 0: return <Notifications color="info" />; // Info
      case 1: return <Warning color="warning" />; // Warning
      case 2: return <ErrorIcon color="error" />; // Critical
      default: return <Notifications />;
    }
  };

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 420, borderRadius: 3, mt: 1.5, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.1)' } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">{t('notifications')}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {unreadCount > 0 && (
              <Tooltip title={t('mark_all_read')}>
                <IconButton size="small" color="primary" onClick={handleReadAll}>
                  <DoneAll fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Chip label={unreadCount} size="small" color="error" variant="filled" />
          </Box>
        </Box>
        <Divider />
        
        <List sx={{ p: 0, overflow: 'auto' }}>
          {notifications.length > 0 ? (
            notifications.map((notif, index) => (
              <React.Fragment key={notif.id + index}>
                <ListItemButton 
                  onClick={() => handleMarkAsRead(notif.id, notif.link)}
                  sx={{ 
                    py: 1.5,
                    px: 2,
                    bgcolor: notif.isRead ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                    borderLeft: !notif.isRead ? '4px solid' : 'none',
                    borderLeftColor: notif.severity === 2 ? 'error.main' : 'primary.main',
                    opacity: notif.isRead ? 0.7 : 1
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 45 }}>
                    <Avatar sx={{ bgcolor: notif.isRead ? 'grey.200' : 'action.hover', width: 32, height: 32 }}>
                      {getSeverityIcon(notif.severity, notif.type)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={notif.title}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {notif.message}
                        </Typography>
                        <Typography variant="caption" color="primary.main" fontWeight="bold">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: dateLocale })}
                        </Typography>
                      </Box>
                    }
                    primaryTypographyProps={{ 
                        variant: 'body2', 
                        fontWeight: notif.isRead ? 'medium' : 'bold',
                        color: notif.isRead ? 'text.secondary' : 'text.primary'
                    }}
                  />
                </ListItemButton>
                <Divider component="li" />
              </React.Fragment>
            ))
          ) : (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Notifications sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary">{t('no_notifications')}</Typography>
            </Box>
          )}
        </List>
        
        <Box sx={{ p: 1 }}>
          <Button 
            fullWidth 
            size="small" 
            variant="text" 
            onClick={() => { navigate('/audit-logs'); handleClose(); }}
            sx={{ fontWeight: 'bold' }}
          >
            {t('view_all')}
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;
