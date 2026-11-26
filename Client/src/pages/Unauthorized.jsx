import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { GppBadOutlined, Logout } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions';

const Unauthorized = () => {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { userPermissions, isAdmin } = usePermissions();

    React.useEffect(() => {
        // If user is already authenticated but lands here, they stay here to see the message.
        // We only redirect if they are Admin (who should have access to everything)
        if (isAdmin) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAdmin, navigate]);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login', { replace: true });
    };

    return (
        <Container maxWidth="sm">
            <Box 
                sx={{ 
                    minHeight: '100vh', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    py: 10
                }}
            >
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 6, 
                        textAlign: 'center', 
                        borderRadius: 4,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper'
                    }}
                >
                    <Box 
                        sx={{ 
                            width: 80, 
                            height: 80, 
                            borderRadius: '50%', 
                            bgcolor: 'error.lighter', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            mb: 3,
                            mx: 'auto'
                        }}
                    >
                        <GppBadOutlined sx={{ fontSize: 48, color: 'error.main' }} />
                    </Box>

                    <Typography variant="h4" fontWeight="800" gutterBottom>
                        {t('unauthorized_access')}
                    </Typography>

                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                        {t('unauthorized_message')}
                        <br />
                        <Typography component="span" fontWeight="bold" color="text.primary">
                            {t('unauthorized_contact_admin')}
                        </Typography>
                    </Typography>

                    <Button 
                        variant="contained" 
                        color="primary" 
                        size="large" 
                        startIcon={i18n.language === 'ar' ? <Logout sx={{ ml: 1 }} /> : <Logout sx={{ mr: 1 }} />}
                        onClick={handleLogout}
                        sx={{ 
                            px: 4, 
                            py: 1.5, 
                            borderRadius: 2,
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                        }}
                    >
                        {t('logout')}
                    </Button>
                </Paper>
            </Box>
        </Container>
    );
};

export default Unauthorized;
