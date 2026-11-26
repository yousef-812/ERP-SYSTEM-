import React from 'react';
import { Box, Container, Grid, Typography, Link, IconButton, Divider } from '@mui/material';
import { Email, Phone, LocationOn } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

const PublicFooter = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: t('footer_products'),
      links: [
        { label: t('menu_core_suite'), path: '/products/core' },
        { label: t('menu_sales_suite'), path: '/products/sales' },
        { label: t('menu_inventory_management'), path: '/products/inventory' },
        { label: t('menu_hr_suite'), path: '/products/hr' },
      ]
    },
    {
      title: t('footer_resources'),
      links: [
        { label: t('menu_solutions'), path: '/solutions' },
        { label: t('menu_support_blogs'), path: '/support' },
        { label: t('menu_company'), path: '/company' },
        { label: t('sign_in'), path: '/login' },
      ]
    }
  ];

  return (
    <Box sx={{ bgcolor: '#001529', color: 'rgba(255,255,255,0.7)', pt: 8, pb: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          
          {/* Company Column */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" color="white" fontWeight="900" sx={{ mb: 2, letterSpacing: 1 }}>
              {t('footer_about_title')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.8 }}>
              {t('footer_about_text')}
            </Typography>
          </Grid>

          {/* Navigation Columns Removed */}
        </Grid>

        <Divider sx={{ mt: 6, mb: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="caption">
            © {currentYear} {settings.CompanyName || t('app_name')}. {t('footer_all_rights')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default PublicFooter;
