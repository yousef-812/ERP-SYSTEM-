import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid as MuiGrid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Divider,
  useTheme,
  alpha,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogContent
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  AssessmentOutlined as Assessment, 
  DownloadOutlined as Download, 
  ShowChartOutlined as ShowChart,
  AttachMoneyOutlined as Money,
  PrintOutlined as PrintIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useSettings } from '../../context/SettingsContext';
import { API_URLS } from '../../api';
import { getCurrencySymbol } from '../../utils/currencyHelper';
import PageHelp from '../../components/PageHelp';

const AnnualReport = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();

  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [printPreview, setPrintPreview] = useState(false);

  useEffect(() => {
    if (printPreview) {
      const timer = setTimeout(() => {
        window.print();
        setPrintPreview(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [printPreview]);


  const fetchReport = async (selectedYear) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URLS.ACCOUNTING.ANNUAL_REPORT}?year=${selectedYear}`);
      setReport(res.data);
    } catch (err) {
      setSnackbar({ open: true, message: t('bi_load_error_annual'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(year);
  }, [year]);

  const handleYearChange = (e) => {
    setYear(e.target.value);
  };

  if (loading && !report) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              {t('annual_report')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('annual_report_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="annual_report" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }} className="no-print">
          <TextField 
            select 
            size="small" 
            value={year} 
            onChange={handleYearChange}
            sx={{ width: 120, bgcolor: 'background.paper' }}
          >
            {[...Array(5)].map((_, i) => (
              <MenuItem key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</MenuItem>
            ))}
          </TextField>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<PrintIcon />} 
            sx={{ borderRadius: 2 }}
            onClick={() => setPrintPreview(true)}
          >
            {t('print_report')}
          </Button>
        </Box>
      </Box>

      {/* Warehouse Filter Indicator */}
      {report?.filteredBy && (
        <Box 
          sx={{ 
            mb: 3, 
            p: 2, 
            borderRadius: 3, 
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap'
          }}
        >
          <Typography variant="body2" fontWeight="700" color="primary.main">
            {t('displaying_data_for')}:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {report.filteredBy.map((name, idx) => (
              <Box 
                key={idx}
                sx={{ 
                  px: 1.5, 
                  py: 0.5, 
                  borderRadius: 1, 
                  bgcolor: 'background.paper', 
                  border: `1px solid ${theme.palette.divider}`,
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'text.secondary',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                {t(name)}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {report && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { label: t('total_revenue'), value: `${report.totalRevenue.toLocaleString()} ${getCurrencySymbol(settings.Currency, i18n.language)}`, icon: <Money />, color: theme.palette.success.main },
              { label: t('total_expenses'), value: `${report.totalExpenses.toLocaleString()} ${getCurrencySymbol(settings.Currency, i18n.language)}`, icon: <ShowChart />, color: theme.palette.error.main },
              { label: t('net_profit_margin'), value: `${report.netProfit.toLocaleString()} ${getCurrencySymbol(settings.Currency, i18n.language)}`, icon: <Assessment />, color: theme.palette.primary.main },
            ].map((metric, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={index}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    borderRadius: 4, 
                    border: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha(metric.color, 0.1), color: metric.color, display: 'flex' }}>
                    {metric.icon}
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="700">{metric.label}</Typography>
                    <Typography variant="h5" fontWeight="800">{metric.value}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, mb: 4 }}>
            <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}>{t('quarterly_breakdown')}</Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <TableRow>
                    <TableCell><Typography fontWeight="700">{t('quarter_label')}</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight="700">{t('revenue')}</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight="700">{t('expenses')}</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight="700">{t('net_profit')}</Typography></TableCell>
                    <TableCell align="center"><Typography fontWeight="700">{t('status')}</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.quarters.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell><Typography fontWeight="600">{row.q}</Typography></TableCell>
                      <TableCell align="right"><Typography fontWeight="600" color="success.main">{row.rev.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography></TableCell>
                      <TableCell align="right"><Typography fontWeight="600" color="error.main">{row.exp.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography></TableCell>
                      <TableCell align="right"><Typography fontWeight="700" color="primary.main">{row.profit.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography></TableCell>
                      <TableCell align="center">
                        <Box sx={{
                          px: 2, py: 0.5, borderRadius: 20, display: 'inline-block',
                          bgcolor: row.profit > 0 ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                          color: row.profit > 0 ? theme.palette.success.main : theme.palette.error.main,
                          fontWeight: 'bold', fontSize: '0.75rem'
                        }}>
                          {row.profit > 0 ? t('financial_status_healthy') : t('financial_status_deficit')}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
            <Typography variant="h6" fontWeight="700" gutterBottom>{t('executive_summary')}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary" paragraph sx={{ lineHeight: 1.8 }}>
              {t('summary_fiscal_year_prefix')} {report.year}، {t('summary_revenue_part')} <strong>{report.totalRevenue.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</strong> {t('summary_expenses_part')} <strong>{report.totalExpenses.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</strong>. 
              {t('summary_profit_part')} <strong>{report.netProfit.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</strong>. 
              {report.netProfit > 0 ? t('summary_healthy_conclusion') : t('summary_deficit_conclusion')}
            </Typography>
          </Paper>
        </>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      {/* Print Preview Dialog */}
      <Dialog 
        open={printPreview} 
        onClose={() => setPrintPreview(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: { xs: 4, print: 0 }, bgcolor: 'white', color: 'black', boxShadow: { print: 'none' } } }}
      >
        <DialogContent sx={{ p: 4 }}>
             <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">{settings.CompanyName || t('app_name')}</Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>{t('annual_report')} - {year}</Typography>
                <Divider sx={{ my: 2, borderColor: 'black' }} />
                <Typography variant="body2" sx={{ mb: 2 }}>{t('report_date')}: {new Date().toLocaleDateString(i18n.language)}</Typography>
            </Box>

            {/* Metrics */}
            <MuiGrid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { label: t('total_revenue'), value: report?.totalRevenue },
                    { label: t('total_expenses'), value: report?.totalExpenses },
                    { label: t('net_profit'), value: report?.netProfit }
                ].map((m, i) => (
                    <MuiGrid item xs={4} key={i}>
                        <Box sx={{ p: 2, border: '1px solid #eee', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">{m.label}</Typography>
                            <Typography variant="h6" fontWeight="bold">
                                {m.value?.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                            </Typography>
                        </Box>
                    </MuiGrid>
                ))}
            </MuiGrid>

            {/* Quarterly Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: { xs: '1px solid #eee', print: 'none' }, mb: 4 }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>{t('quarter_label')}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('revenue')}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('expenses')}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('net_profit')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {report?.quarters.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell sx={{ fontWeight: '600' }}>{row.q}</TableCell>
                                <TableCell align="right">{row.rev.toLocaleString()}</TableCell>
                                <TableCell align="right">{row.exp.toLocaleString()}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{row.profit.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Summary */}
            <Box sx={{ p: 2, border: '1px solid #eee', bgcolor: '#fafafa' }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>{t('executive_summary')}</Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {t('summary_fiscal_year_prefix')} {year}، {t('summary_revenue_part')} {report?.totalRevenue.toLocaleString()} {t('summary_expenses_part')} {report?.totalExpenses.toLocaleString()}. 
                    {t('summary_profit_part')} {report?.netProfit.toLocaleString()}.
                </Typography>
            </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AnnualReport;
