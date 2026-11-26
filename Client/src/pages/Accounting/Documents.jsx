import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  IconButton, 
  Divider,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  ListItemButton,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Grid,
  Backdrop
} from '@mui/material';
import { 
  FileUploadOutlined as FileUpload, 
  FolderOutlined as Folder, 
  InsertDriveFileOutlined as InsertDriveFile, 
  Search as SearchIcon, 
  MoreVertOutlined as MoreVert,
  DeleteOutlined as Delete,
  DownloadOutlined as Download,
  PictureAsPdfOutlined as PdfIcon,
  Close,
  EditOutlined as Edit,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URLS } from '../../api';
import { useConfirm } from '../../context/ConfirmContext';
import { usePermissions } from '../../hooks/usePermissions';
import PageHelp from '../../components/PageHelp';

const Documents = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { hasPermission, assignedWarehouses, isAdmin } = usePermissions();
  const [documents, setDocuments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('null'); // 'null' string to represent General in Select
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Dialog States
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, displayName: '', category: 'General', warehouseId: 'null' });
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URLS.DOCUMENTS, {
        params: { 
          category: selectedCategory === 'All' ? '' : selectedCategory,
          warehouseId: selectedWarehouseId // Send the string value directly ('null', 'all', or Guid)
        }
      });
      setDocuments(res.data);
    } catch (err) {
      showSnackbar(t('error_fetching_docs'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(API_URLS.WAREHOUSES);
      setWarehouses(res.data);
    } catch (err) {
      console.error("Error fetching warehouses", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchWarehouses();
  }, [selectedCategory, selectedWarehouseId]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProcessing(true);
      setTimeout(() => {
        setUploadForm({ ...uploadForm, file, displayName: file.name, warehouseId: 'null' });
        setUploadDialogOpen(true);
        setProcessing(false);
      }, 500);
    }
  };

  const handleCancelUpload = () => {
    setUploadDialogOpen(false);
    setUploadForm({ file: null, displayName: '', category: 'General', warehouseId: 'null' });
    fetchDocuments(); 
  };

  const handleCancelRename = () => {
    setRenameDialogOpen(false);
    fetchDocuments(); // Refresh page on cancel as requested
  };

  const handleConfirmUpload = async () => {
    if (!uploadForm.file) return;

    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('displayName', uploadForm.displayName);
    formData.append('category', uploadForm.category);
    if (uploadForm.warehouseId && uploadForm.warehouseId !== 'null') {
      formData.append('warehouseId', uploadForm.warehouseId);
    }

    try {
      setLoading(true);
      await axios.post(`${API_URLS.DOCUMENTS}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showSnackbar(t('upload_success'));
      setUploadDialogOpen(false);
      setUploadForm({ file: null, displayName: '', category: 'General', warehouseId: 'null' });
      fetchDocuments();
    } catch (err) {
      showSnackbar(t('upload_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({
      title: t('confirm_delete_title'),
      message: t('confirm_delete_msg')
    })) {
      try {
        await axios.delete(`${API_URLS.DOCUMENTS}/${id}`);
        showSnackbar(t('delete_success'));
        fetchDocuments();
        handleMenuClose();
      } catch (err) {
        showSnackbar(t('delete_error'), 'error');
      }
    }
  };

  const handleRename = async () => {
    if (!selectedDoc || !uploadForm.displayName) return;
    try {
      await axios.patch(`${API_URLS.DOCUMENTS}/${selectedDoc.id}/rename`, `"${uploadForm.displayName}"`, {
        headers: { 'Content-Type': 'application/json' }
      });
      showSnackbar(t('rename_success'));
      setRenameDialogOpen(false);
      fetchDocuments();
      handleMenuClose();
    } catch (err) {
      showSnackbar(t('rename_error'), 'error');
    }
  };

  const handleMenuOpen = (event, doc) => {
    setAnchorEl(event.currentTarget);
    setSelectedDoc(doc);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocs = documents.filter(d => 
    d.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedCategory === 'All' || d.category === selectedCategory)
  );

  const getDocCount = (cat) => {
    if (cat === 'All') return documents.length;
    return documents.filter(d => d.category === cat).length;
  };

  const categories = [
    { key: 'All', name: t('all_files'), icon: <Folder /> },
    { key: 'Finance', name: t('finance_label'), icon: <Folder /> },
    { key: 'HR', name: t('hr_label'), icon: <Folder /> },
    { key: 'System', name: t('system_logs_label'), icon: <Folder /> },
  ];

  if (loading && documents.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              {t('documents')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('manage_company_documents')}
            </Typography>
          </Box>
          <PageHelp helpKey="documents" />
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<FileUpload />}
          component="label"
          sx={{ borderRadius: 3, px: 3, py: 1.2 }}
        >
          {t('upload_file')}
          <input 
            type="file" 
            hidden 
            onChange={handleFileSelect} 
          />
        </Button>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <TextField 
          fullWidth 
          placeholder={t('search_documents')} 
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
          sx={{ bgcolor: 'background.paper', borderRadius: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('warehouse')}</InputLabel>
          <Select
            value={selectedWarehouseId}
            label={t('warehouse')}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            sx={{ borderRadius: 3 }}
          >
            <MenuItem value="null">{t('general')}</MenuItem>
            <MenuItem value="all">{t('all')}</MenuItem>
            {warehouses.map(w => (
              <MenuItem key={w.id} value={w.id}>
                {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={4}>
        {/* Categories Sidebar */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 2, textTransform: 'uppercase', color: 'text.secondary', px: 1 }}>
              {t('categories')}
            </Typography>
            <List dense>
              {categories.map((folder) => (
                <ListItem key={folder.key} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton 
                    selected={selectedCategory === folder.key}
                    onClick={() => setSelectedCategory(folder.key)}
                    sx={{ 
                      borderRadius: 3,
                      '&.Mui-selected': { 
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: selectedCategory === folder.key ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1), 
                        color: selectedCategory === folder.key ? 'white' : theme.palette.primary.main,
                        width: 32, height: 32
                      }}>
                        {folder.icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={<Typography variant="body2" fontWeight="700">{folder.name}</Typography>} 
                      secondary={t('files_count', { count: getDocCount(folder.key) })} 
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Files List */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden', bgcolor: 'background.paper' }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="800">{selectedCategory === 'All' ? t('all_files') : categories.find(c => c.key === selectedCategory)?.name}</Typography>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ bgcolor: 'action.hover', px: 1.5, py: 0.5, borderRadius: 2 }}>
                {t('total_files', { count: filteredDocs.length })}
              </Typography>
            </Box>
            <List sx={{ py: 0 }}>
              {filteredDocs.length === 0 ? (
                <Box sx={{ p: 8, textAlign: 'center' }}>
                  <InsertDriveFile sx={{ fontSize: 60, color: 'action.disabled', mb: 2 }} />
                  <Typography color="text.secondary" fontWeight="600">{t('no_documents')}</Typography>
                </Box>
              ) : filteredDocs.map((doc, index) => (
                <React.Fragment key={doc.id || index}>
                  <ListItem 
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          component="a" 
                          href={`${window.location.origin}/uploads/${doc.fileName}`} 
                          target="_blank" 
                          download={doc.displayName}
                        >
                          <Download fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, doc)}>
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                    sx={{ 
                      py: 2, 
                      px: 3, 
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } 
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: alpha(doc.fileExtension === 'PDF' ? theme.palette.error.main : theme.palette.primary.main, 0.1), 
                        color: doc.fileExtension === 'PDF' ? theme.palette.error.main : theme.palette.primary.main,
                        borderRadius: 2
                      }}>
                        {doc.fileExtension === 'PDF' ? <PdfIcon /> : <InsertDriveFile />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={<Typography variant="body1" fontWeight="700">{doc.displayName}</Typography>} 
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ backgroundColor: theme.palette.action.hover, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{doc.category}</span>
                          • {formatBytes(doc.fileSize)} • {new Date(doc.uploadDate).toLocaleDateString()}
                        </Typography>
                      } 
                    />
                  </ListItem>
                  {index < filteredDocs.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('upload_details')}
          <IconButton onClick={() => setUploadDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ p: 2, border: '2px dashed', borderColor: 'divider', borderRadius: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
               <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
               <Typography variant="body2" fontWeight="700">{uploadForm.file?.name}</Typography>
               <Typography variant="caption" color="text.secondary">{formatBytes(uploadForm.file?.size || 0)}</Typography>
            </Box>

            <TextField 
              fullWidth 
              label={t('display_name')} 
              value={uploadForm.displayName}
              onChange={(e) => setUploadForm({ ...uploadForm, displayName: e.target.value })}
              size="small"
            />

            <FormControl fullWidth size="small">
              <InputLabel>{t('warehouse')}</InputLabel>
              <Select
                value={uploadForm.warehouseId}
                label={t('warehouse')}
                onChange={(e) => setUploadForm({ ...uploadForm, warehouseId: e.target.value })}
              >
                <MenuItem value="null">{t('general')}</MenuItem>
                {warehouses
                  .filter(w => isAdmin || assignedWarehouses.some(aw => aw.warehouseId === w.id))
                  .map(w => (
                    <MenuItem key={w.id} value={w.id}>
                      {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>{t('category')}</InputLabel>
              <Select
                value={uploadForm.category}
                label={t('category')}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
              >
                <MenuItem value="General">{t('general')}</MenuItem>
                <MenuItem value="Finance">{t('finance_label')}</MenuItem>
                <MenuItem value="HR">{t('hr_label')}</MenuItem>
                <MenuItem value="System">{t('system_logs_label')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleCancelUpload} color="inherit" fontWeight="bold">{t('cancel')}</Button>
          <Button onClick={handleConfirmUpload} variant="contained" disabled={loading} startIcon={loading && <CircularProgress size={20} />}>
            {t('upload')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: '800' }}>{t('rename_document')}</DialogTitle>
        <DialogContent>
          <TextField 
            fullWidth 
            label={t('new_name')} 
            value={uploadForm.displayName}
            onChange={(e) => setUploadForm({ ...uploadForm, displayName: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCancelRename} color="inherit">{t('cancel')}</Button>
          <Button onClick={handleRename} variant="contained">{t('save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 150, boxShadow: theme.shadows[3] } }}
      >
        <MenuItem onClick={() => { setUploadForm({ ...uploadForm, displayName: selectedDoc.displayName }); setRenameDialogOpen(true); }}>
          <Edit sx={{ mr: 1, fontSize: 18 }} /> {t('rename')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleDelete(selectedDoc.id)} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1, fontSize: 18 }} /> {t('delete')}
        </MenuItem>
      </Menu>
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>

      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1000 }}
        open={processing}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2, fontWeight: 'bold' }}>{t('processing')}...</Typography>
        </Box>
      </Backdrop>
    </Box>
  );
};

export default Documents;
