import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Grid,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  alpha,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Send as SubmitIcon,
  Description as DocIcon,
  Delete as DeleteIcon,
  Inventory as ProductIcon,
  AccountCircle as UserIcon,
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Warehouse as WarehouseIcon,
  CheckCircleOutline as ApproveIcon,
  HighlightOff as RejectIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_URLS } from '../../api';
import { format } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions';
import PageHelp from '../../components/PageHelp';

const PurchaseRequests = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  const [newPR, setNewPR] = useState({
    justification: '',
    warehouseId: '', 
    details: [{ productId: '', quantity: 1, estimatedUnitPrice: 0, warehouseId: '' }]
  });

  // Permissions
  const canApprove = hasPermission('اعتماد الطلبات') || hasPermission('اعتماد كافة مسارات العمل');
  const canCreate = hasPermission('إنشاء طلب شراء');

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchPRs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URLS.PURCHASE_REQUESTS);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching PRs:', error);
      showSnackbar(t('error_fetching_data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [prodRes, warehouseRes] = await Promise.all([
        axios.get(API_URLS.PRODUCTS),
        axios.get(API_URLS.WAREHOUSES)
      ]);
      setProducts(prodRes.data);
      setWarehouses(warehouseRes.data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  useEffect(() => {
    fetchPRs();
    fetchMetadata();
  }, []);

  const handleAddDetail = () => {
    setNewPR(prev => ({
      ...prev,
      details: [...prev.details, { productId: '', quantity: 1, estimatedUnitPrice: 0, warehouseId: prev.warehouseId }]
    }));
  };

  const handleRemoveDetail = (index) => {
    setNewPR(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }));
  };

  const handleDetailChange = (index, field, value) => {
    const updatedDetails = [...newPR.details];
    updatedDetails[index][field] = value;
    
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updatedDetails[index].estimatedUnitPrice = prod.price || 0;
      }
    }
    
    setNewPR(prev => ({ ...prev, details: updatedDetails }));
  };

  const calculateTotal = (details) => {
    return details.reduce((sum, d) => sum + (d.quantity * d.estimatedUnitPrice), 0);
  };

  const handleSave = async () => {
    try {
      if (!newPR.justification) {
        showSnackbar(t('justification_required', 'السبب مطلوب'), 'warning');
        return;
      }
      if (newPR.details.some(d => !d.productId || !d.warehouseId || d.quantity <= 0)) {
        showSnackbar(t('fill_all_details', 'يرجى إكمال بيانات المنتجات والمستودعات'), 'warning');
        return;
      }

      await axios.post(API_URLS.PURCHASE_REQUESTS, newPR);
      showSnackbar(t('pr_created_success'), 'success');
      setOpenAdd(false);
      setNewPR({ justification: '', warehouseId: '', details: [{ productId: '', quantity: 1, estimatedUnitPrice: 0, warehouseId: '' }] });
      fetchPRs();
    } catch (error) {
      showSnackbar(t('error_saving'), 'error');
    }
  };

  const handleSubmitToWorkflow = async (id) => {
    try {
      await axios.post(`${API_URLS.PURCHASE_REQUESTS}/${id}/submit`);
      showSnackbar(t('pr_submitted_success'), 'success');
      fetchPRs();
    } catch (error) {
      showSnackbar(t('error_submitting'), 'error');
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.post(`${API_URLS.PURCHASE_REQUESTS}/${id}/approve`);
      showSnackbar(t('pr_approved_success', 'تم اعتماد الطلب بنجاح'), 'success');
      fetchPRs();
    } catch (error) {
      showSnackbar(t('error_approving'), 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.post(`${API_URLS.PURCHASE_REQUESTS}/${id}/reject`);
      showSnackbar(t('pr_rejected_success', 'تم رفض الطلب'), 'info');
      fetchPRs();
    } catch (error) {
      showSnackbar(t('error_rejecting'), 'error');
    }
  };

  const getStatusChip = (status) => {
    const statusMap = {
      0: { label: t('pr_status_draft'), color: 'default', icon: <DocIcon /> },
      1: { label: t('pr_status_pending'), color: 'warning', icon: <PendingIcon /> },
      2: { label: t('pr_status_approved'), color: 'success', icon: <ApprovedIcon /> },
      3: { label: t('pr_status_rejected'), color: 'error', icon: <RejectedIcon /> },
      4: { label: t('pr_status_converted'), color: 'info', icon: <ApprovedIcon /> }
    };
    const current = statusMap[status] || { label: status, color: 'default' };
    return <Chip size="small" icon={current.icon} label={current.label} color={current.color} variant="outlined" />;
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" color="primary.main" sx={{ letterSpacing: -1 }}>
              {t('purchase_requests')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('manage_internal_requisitions')}
            </Typography>
          </Box>
          <PageHelp helpKey="purchase_requests" />
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAdd(true)}
            sx={{ borderRadius: 2, px: 3, py: 1, boxShadow: 3, fontWeight: 'bold' }}
          >
            {t('create_request')}
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('request_number')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('requested_by')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('date')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('total_estimated')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('status')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 10, color: 'text.secondary' }}>
                  <DocIcon sx={{ fontSize: 48, mb: 1, opacity: 0.2 }} />
                  <Typography>{t('no_requests_found')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((pr) => (
                <TableRow key={pr.id} hover>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{pr.prNumber}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <UserIcon fontSize="small" color="action" />
                      {i18n.language === 'en' ? (pr.requestedBy?.nameEn || pr.requestedBy?.name || t('unknown')) : (pr.requestedBy?.name || t('unknown'))}
                    </Box>
                  </TableCell>
                  <TableCell>{format(new Date(pr.requestDate), 'yyyy-MM-dd')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {(pr.totalEstimatedAmount || calculateTotal(pr.details || [])).toLocaleString()} {t('currency_symbol', 'EGP')}
                  </TableCell>
                  <TableCell>{getStatusChip(pr.status)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title={t('view_details')}>
                        <IconButton size="small" color="primary" onClick={() => { setSelectedPR(pr); setOpenDetails(true); }}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {/* Submission Action (For Author) */}
                      {pr.status === 0 && (
                        <Tooltip title={t('submit_for_approval')}>
                          <IconButton size="small" color="success" onClick={() => handleSubmitToWorkflow(pr.id)}>
                            <SubmitIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Approval Actions (For Manager) */}
                      {pr.status === 1 && canApprove && (
                        <>
                          <Tooltip title={t('approve_request', 'اعتماد الطلب')}>
                            <IconButton size="small" color="success" onClick={() => handleApprove(pr.id)}>
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('reject_request', 'رفض الطلب')}>
                            <IconButton size="small" color="error" onClick={() => handleReject(pr.id)}>
                              <RejectIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Request Dialog */}
      <Dialog 
        open={openAdd} 
        onClose={() => setOpenAdd(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, px: 3, pt: 3 }}>
          {t('create_purchase_request')}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ flex: '1 1 500px' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">
                {t('justification_motive')}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={newPR.justification}
                onChange={(e) => setNewPR(prev => ({ ...prev, justification: e.target.value }))}
                placeholder={t('why_do_we_need_this')}
                variant="outlined"
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">
                {t('default_warehouse')}
              </Typography>
              <TextField
                select
                fullWidth
                value={newPR.warehouseId}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPR(prev => ({ 
                    ...prev, 
                    warehouseId: val,
                    details: prev.details.map(d => ({ ...d, warehouseId: d.warehouseId || val }))
                  }));
                }}
                label={t('select_warehouse')}
              >
                {warehouses.map(w => (
                  <MenuItem key={w.id} value={w.id}>
                    {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ProductIcon fontSize="small" /> {t('products_to_request')}
              </Typography>
              <Button 
                startIcon={<AddIcon />} 
                onClick={handleAddDetail} 
                size="small" 
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                {t('add_another_product')}
              </Button>
            </Box>

            {newPR.details.map((detail, index) => (
              <Paper 
                key={index}
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  mb: 3,
                  borderRadius: 3, 
                  bgcolor: alpha(theme.palette.background.default, 0.4),
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    {t('product')}
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    value={detail.productId}
                    onChange={(e) => handleDetailChange(index, 'productId', e.target.value)}
                    size="small"
                  >
                    {products.map(p => (
                      <MenuItem key={p.id} value={p.id}>
                        {i18n.language === 'en' ? (p.nameEn || p.name) : p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    {t('target_warehouse')}
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    value={detail.warehouseId}
                    onChange={(e) => handleDetailChange(index, 'warehouseId', e.target.value)}
                    size="small"
                  >
                    {warehouses.map(w => (
                      <MenuItem key={w.id} value={w.id}>
                        {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      type="number"
                      fullWidth
                      label={t('quantity')}
                      value={detail.quantity}
                      onChange={(e) => handleDetailChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      type="number"
                      fullWidth
                      label={t('est_unit_price')}
                      value={detail.estimatedUnitPrice}
                      onChange={(e) => handleDetailChange(index, 'estimatedUnitPrice', parseFloat(e.target.value) || 0)}
                      size="small"
                    />
                  </Box>
                  <IconButton 
                    color="error" 
                    onClick={() => handleRemoveDetail(index)} 
                    disabled={newPR.details.length === 1}
                    sx={{ bgcolor: alpha(theme.palette.error.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.1) }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>

          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: alpha(theme.palette.primary.main, 0.1), 
            borderRadius: 2, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px dashed',
            borderColor: 'primary.main'
          }}>
            <Typography variant="subtitle2" fontWeight="bold" color="primary">{t('total_estimated')}</Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {calculateTotal(newPR.details).toLocaleString()} {t('currency_symbol', 'EGP')}
            </Typography>
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setOpenAdd(false)} color="inherit" sx={{ fontWeight: 'bold' }}>{t('cancel')}</Button>
          <Button 
            variant="contained" 
            onClick={handleSave} 
            sx={{ px: 4, borderRadius: 2, fontWeight: 'bold', boxShadow: 2 }}
          >
            {t('save_as_draft')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog 
        open={openDetails} 
        onClose={() => setOpenDetails(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedPR && (
          <>
            <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DocIcon color="primary" /> {selectedPR.prNumber}
              </Box>
              {getStatusChip(selectedPR.status)}
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 3 }}>
              <Box sx={{ mb: 3, p: 2, bgcolor: alpha(theme.palette.action.hover, 0.5), borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold" uppercase>{t('justification_motive')}</Typography>
                <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                  {selectedPR.justification || t('no_justification')}
                </Typography>
              </Box>
              
              <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">{t('items_requested')}</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>{t('product')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{t('warehouse')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('qty')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPR.details?.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>
                            {i18n.language === 'en' ? (item.product?.nameEn || item.product?.name || t('unknown_product')) : (item.product?.name || t('unknown_product'))}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <WarehouseIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            {i18n.language === 'en' ? (item.warehouse?.nameEn || item.warehouse?.name || t('unassigned')) : (item.warehouse?.name || t('unassigned'))}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ 
                mt: 3, 
                p: 2.5, 
                bgcolor: 'primary.main', 
                color: 'white', 
                borderRadius: 3, 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
              }}>
                <Typography variant="subtitle1" fontWeight="bold">{t('total_estimated')}</Typography>
                <Typography variant="h5" fontWeight="900">
                  {(selectedPR.totalEstimatedAmount || calculateTotal(selectedPR.details || [])).toLocaleString()} {t('currency_symbol', 'EGP')}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenDetails(false)} variant="outlined" sx={{ borderRadius: 2, px: 4 }}>{t('close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PurchaseRequests;
