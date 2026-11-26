import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid as MuiGrid, 
  Paper, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Divider,
  Snackbar
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  History as HistoryIcon, 
  CompareArrowsOutlined as CompareArrows, 
  Inventory2Outlined as InventoryIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URLS, apiClient } from '../../api';
import PageHelp from '../../components/PageHelp';

const StockAdjustments = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ productId: '', adjustmentQuantity: 0, note: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedProductName, setSelectedProductName] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adjRes, prodRes] = await Promise.all([
        axios.get(API_URLS.STOCK.ADJUSTMENTS),
        axios.get(API_URLS.PRODUCTS)
      ]);
      setAdjustments(adjRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (productId, productName) => {
    try {
      const res = await axios.get(API_URLS.STOCK.HISTORY(productId));
      setHistory(res.data);
      setSelectedProductName(productName);
      setHistoryOpen(true);
    } catch (err) {
      showSnackbar(t('error_fetching_history'), 'error');
    }
  };

  const getMovementTypeLabel = (type) => {
    switch (type) {
      case 0: return { label: t('incoming'), color: 'success' };
      case 1: return { label: t('outgoing'), color: 'error' };
      case 2: return { label: t('adjustment'), color: 'warning' };
      case 3: return { label: t('return'), color: 'info' };
      case 4: return { label: t('internal_transfer'), color: 'primary' };
      default: return { label: t('unknown'), color: 'default' };
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpen = () => {
    setFormData({ productId: '', adjustmentQuantity: 0, note: '' });
    setOpen(true);
  };



  const handleSave = async () => {
    try {
      await apiClient.post(API_URLS.STOCK.ADJUST, formData);
      setOpen(false);
      showSnackbar(t('stock_adjust_success'));
      fetchData();
    } catch (err) {
      showSnackbar(err.response?.data || t('error_saving'), 'error');
    }
  };

  const filteredAdjustments = adjustments.filter(a => 
    (a.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.note || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              {t('stock_adjustment')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('stock_adjustment_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="stock_adjustment" />
        </Box>
        <Stack direction="row" spacing={2}>

          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpen(true)}
            sx={{ borderRadius: 2, px: 3, fontWeight: 'bold' }}
          >
            {t('add_adjustment')}
          </Button>
        </Stack>
      </Box>

      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          borderRadius: 4, 
          border: `1px solid ${theme.palette.divider}`,
          mb: 4
        }}
      >
        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <TextField 
            fullWidth 
            placeholder={t('search_products')} 
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
              <TableRow>
                <TableCell><Typography fontWeight="700">ID</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('product')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('qty')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('type')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('user')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('date')}</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight="700">{t('actions')}</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAdjustments.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={7} align="center"><Typography color="text.secondary">{t('no_stock_adjustments_found')}</Typography></TableCell>
                </TableRow>
              ) : filteredAdjustments.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell><Typography variant="body2" color="primary" fontWeight="600">{row.id.substring(0, 8)}</Typography></TableCell>
                  <TableCell><Typography fontWeight="600">{row.product?.name || 'Unknown Product'}</Typography></TableCell>
                  <TableCell>
                    <Typography fontWeight="700" color={row.quantity >= 0 ? 'success.main' : 'error.main'}>
                      {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CompareArrows fontSize="inherit" color="action" />
                      <Typography variant="body2">{row.quantity < 0 ? t('loss_deduction') : t('correction_found')}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{row.createdBy || 'System'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{new Date(row.movementDate).toLocaleDateString()}</Typography></TableCell>
                  <TableCell align="right">
                    <Tooltip title={t('product_log')}>
                        <IconButton size="small" color="info" onClick={() => fetchHistory(row.productId, row.product?.name)}>
                            <HistoryIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Adjustment Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{t('new_stock_adjustment')}</DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          <Stack spacing={3}>
            <TextField 
              select 
              fullWidth 
              label={t('product')} 
              value={formData.productId || ''} 
              onChange={(e) => setFormData({...formData, productId: e.target.value})}
            >
               <MenuItem value="" disabled><em>{t('select_product')}</em></MenuItem>
               {products.map(p => (
                 <MenuItem key={p.id} value={p.id}>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                     <Typography>{p.name}</Typography>
                     <Typography variant="caption" color="text.secondary">
                       ({t('current_stock_label', { count: p.stockQuantity })})
                     </Typography>
                   </Box>
                 </MenuItem>
               ))}
            </TextField>

            <TextField 
              type="number"
              fullWidth 
              label={t('adjustment_qty_helper').split('.')[0]} 
              helperText={t('adjustment_qty_helper')}
              value={formData.adjustmentQuantity} 
              onChange={(e) => setFormData({...formData, adjustmentQuantity: parseInt(e.target.value) || 0})} 
            />

            <TextField 
              fullWidth 
              multiline 
              rows={3} 
              label={t('adjustment_note')} 
              value={formData.note} 
              onChange={(e) => setFormData({...formData, note: e.target.value})} 
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpen(false)} color="inherit">{t('cancel')}</Button>
          <Button onClick={handleSave} variant="contained" color="primary" sx={{ px: 4 }} disabled={!formData.productId || formData.adjustmentQuantity === 0}>
            {t('save_adjustment')}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
            {t('stock_history')} - {selectedProductName}
        </DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f9f9f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('date')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('type')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('qty')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('note')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((m) => {
                const info = getMovementTypeLabel(m.type);
                return (
                  <TableRow key={m.id} hover>
                    <TableCell>{new Date(m.movementDate).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={info.label} color={info.color} size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {(m.quantity > 0 ? '+' : '') + m.quantity}
                    </TableCell>
                    <TableCell variant="caption">{m.note || '-'}</TableCell>
                  </TableRow>
                );
              })}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>{t('no_movement_history')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHistoryOpen(false)} color="primary" variant="contained">{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockAdjustments;
