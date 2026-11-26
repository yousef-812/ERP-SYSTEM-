import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Language, Brightness4, Brightness7, Menu as MenuIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../theme/ThemeContext';
import { Link } from 'react-router-dom';

const PublicNavbar = () => {
  const { t, i18n } = useTranslation();
  const { toggleColorMode, mode } = useThemeContext();
  // Drawer state removed as sub-pages are gone

  const handleLanguageChange = () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
           {/* Menu icon removed */}

          <Typography 
            variant="h6" 
            component={Link} 
            to="/" 
            sx={{ 
              flexGrow: 1, 
              textDecoration: 'none', 
              color: 'text.primary',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {t('app_name')}
          </Typography>

          <IconButton color="inherit" onClick={handleLanguageChange}>
            <Language />
            <Typography variant="body2" sx={{ ml: 1, textTransform: 'uppercase' }}>
              {i18n.language === 'en' ? t('language_ar') : t('language_en')}
            </Typography>
          </IconButton>

          <IconButton color="inherit" onClick={toggleColorMode}>
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Ecosystem menu removed */}
    </>
  );
};

export default PublicNavbar;
