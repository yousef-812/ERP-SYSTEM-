import React from 'react';
import { Box, Typography, Button, Container, Grid, Paper, Card, CardContent, CardActionArea, useTheme } from '@mui/material';
import { ArrowForward, Security, Business, Translate, BarChart as BarChartIcon, Inventory, ReceiptLong } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const Landing = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      
      {/* 1. HERO SECTION */}
      <Box sx={{ py: { xs: 8, md: 15 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: { xs: 2, md: 0 } }}>
                <Typography 
                  variant="h2" 
                  fontWeight="900" 
                  gutterBottom 
                  sx={{ 
                    lineHeight: 1.2,
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '3.75rem' }
                  }}
                >
                  {t('landing_title')}
                </Typography>
                <Typography 
                  variant="h6" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 4, 
                    lineHeight: 1.8,
                    fontSize: { xs: '1rem', md: '1.25rem' }
                  }}
                >
                  {t('landing_subtitle')}
                </Typography>
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="large" 
                  onClick={() => navigate('/login')}
                  sx={{ 
                    py: 1.5, 
                    px: 4, 
                    borderRadius: 8, 
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    boxShadow: 4,
                    width: { xs: '100%', sm: 'auto' }
                  }}
                  endIcon={<ArrowForward sx={{ transform: theme.direction === 'rtl' ? 'rotate(180deg)' : 'none', ml: i18n.language === 'ar' ? 0 : 1, mr: i18n.language === 'ar' ? 1 : 0 }} />}
                >
                  {t('go_to_login')}
                </Button>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', p: { xs: 1, sm: 3 } }}>
                <Paper 
                  elevation={12} 
                  sx={{ 
                    width: '100%', 
                    height: { xs: 180, sm: 300, md: 400 }, 
                    borderRadius: 4, 
                    background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Typography variant="h1" sx={{ color: 'rgba(255,255,255,0.1)', fontWeight: 900, transform: 'rotate(-45deg)', fontSize: { xs: '3.5rem', sm: '6rem' } }}>
                    {t('app_name')}
                  </Typography>
                  <Box sx={{ position: 'absolute', bottom: 20, right: 20, width: { xs: 40, md: 60 }, height: { xs: 40, md: 60 }, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)' }} />
                  <Box sx={{ position: 'absolute', top: 40, left: 40, width: { xs: 20, md: 30 }, height: { xs: 20, md: 30 }, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.3)' }} />
                  <Box sx={{ position: 'absolute', top: '40%', left: '10%', width: { xs: 60, md: 100 }, height: { xs: 60, md: 100 }, borderRadius: 2, transform: 'rotate(15deg)', bgcolor: 'rgba(255,255,255,0.1)' }} />
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 2. ECOSYSTEM SECTION */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 8 } }}>
            <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.75rem', md: '3rem' } }}>
              {t('landing_eco_title')}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
              {t('landing_eco_sub')}
            </Typography>
          </Box>
          
          <Grid container spacing={4} sx={{ width: '100%', margin: 0 }}>
            {[
              { title: t('menu_core_suite'), icon: <BarChartIcon sx={{ fontSize: 50, color: '#1976d2' }}/>, path: '/login' },
              { title: t('menu_sales_suite'), icon: <ReceiptLong sx={{ fontSize: 50, color: '#2e7d32' }}/>, path: '/login' },
              { title: t('menu_inventory_management'), icon: <Inventory sx={{ fontSize: 50, color: '#ed6c02' }}/>, path: '/login' }
            ].map((suite, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx} sx={{ p: { xs: 1, sm: 2 } }}>
                <Card 
                    elevation={2} 
                    sx={{ 
                        borderRadius: 3, 
                        height: '100%', 
                        minHeight: { xs: 180, sm: 220 },
                        transition: '0.3s', 
                        '&:hover': { transform: 'translateY(-8px)', boxShadow: 10 } 
                    }}
                >
                  <CardActionArea onClick={() => navigate(suite.path)} sx={{ p: { xs: 3, md: 4 }, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>{suite.icon}</Box>
                    <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>{suite.title}</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ flexGrow: 1, mb: 2 }}>
                      {t('explore_suite')} &rarr;
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 3. FEATURES SECTION */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.75rem', md: '3rem' } }}>
              {t('landing_features_title')}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
              {t('landing_features_sub')}
            </Typography>
          </Box>
          
          <Grid container spacing={6}>
            {[
              { title: t('feat_cloud_title'), desc: t('feat_cloud_desc'), icon: <Security sx={{ fontSize: 40 }} color="primary" /> },
              { title: t('feat_module_title'), desc: t('feat_module_desc'), icon: <Business sx={{ fontSize: 40 }} color="primary" /> },
              { title: t('feat_lang_title'), desc: t('feat_lang_desc'), icon: <Translate sx={{ fontSize: 40 }} color="primary" /> },
            ].map((feat, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Box sx={{ display: 'inline-flex', p: 2, bgcolor: 'action.hover', borderRadius: '50%', mb: 2 }}>
                    {feat.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>{feat.title}</Typography>
                  <Typography variant="body1" color="text.secondary">{feat.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 4. CTA FOOTER */}
      <Box sx={{ py: { xs: 6, md: 10 }, background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)', color: 'white', textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.75rem', md: '3rem' } }}>
            {t('landing_cta_title')}
          </Typography>
          <Typography variant="h6" sx={{ mb: 5, opacity: 0.9, fontSize: { xs: '1rem', md: '1.25rem' } }}>
            {t('landing_cta_sub')}
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            onClick={() => navigate('/login')}
            sx={{ 
              py: 2, px: 6, borderRadius: 8, fontSize: '1.2rem', fontWeight: 'bold',
              bgcolor: 'white', color: 'primary.main',
              width: { xs: '100%', sm: 'auto' },
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            {t('landing_cta_btn')}
          </Button>
        </Container>
      </Box>

    </Box>
  );
};

export default Landing;
