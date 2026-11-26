import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Collapse, 
  IconButton, 
  Breadcrumbs, 
  Link,
  Chip,
  Button,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  InputAdornment
} from '@mui/material';
import { 
  ExpandLess, 
  ExpandMore, 
  FolderOutlined as Folder, 
  AccountBalanceOutlined as AccountBalance,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sync as SyncIcon,
  FileDownload as FileDownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as axios } from '../../api';
import { useSettings } from '../../context/SettingsContext';
import PageHelp from '../../components/PageHelp';

const ChartOfAccounts = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  
  const [openItems, setOpenItems] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [newAccount, setNewAccount] = useState({
    name: '',
    accountCode: '',
    type: 'Asset',
    parentAccountId: ''
  });
  const [selectedWarehouse, setSelectedWarehouse] = useState('');


  const { data: accounts, isLoading, error, refetch } = useQuery({
    queryKey: ['accounts', selectedWarehouse],
    queryFn: async () => {
      const response = await axios.get(`/api/Accounting/accounts${selectedWarehouse ? `?warehouseId=${selectedWarehouse}` : ''}`);
      return response.data;
    }
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await axios.get('/api/Warehouses');
      return response.data;
    }
  });

  const addAccountMutation = useMutation({
    mutationFn: (newAcc) => axios.post('/api/Accounting/accounts', newAcc),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      setIsAddDialogOpen(false);
      setSnackbar({ open: true, message: t('account_added_success'), severity: 'success' });
      setNewAccount({ name: '', accountCode: '', type: 'Asset', parentAccountId: '' });
    },
    onError: () => {
      setSnackbar({ open: true, message: t('error_adding_account'), severity: 'error' });
    }
  });

  const toggleItem = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExport = async () => {
    try {
      setSnackbar({ open: true, message: t('preparing_download'), severity: 'info' });
      const response = await axios.get('/Accounting/accounts/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ChartOfAccounts.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSnackbar({ open: true, message: t('download_success'), severity: 'success' });
    } catch (err) {
      console.error("Export failed:", err);
      setSnackbar({ open: true, message: t('export_failed'), severity: 'error' });
    }
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    addAccountMutation.mutate(newAccount);
  };

  const buildHierarchy = (flatList) => {
    if (!flatList) return [];
    
    // Filter by search query if present
    const filteredList = searchQuery 
      ? flatList.filter(a => 
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          a.accountCode.includes(searchQuery))
      : flatList;

    const map = {};
    const roots = [];

    flatList.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });

    flatList.forEach(item => {
      if (item.parentAccountId && map[item.parentAccountId]) {
        map[item.parentAccountId].children.push(map[item.id]);
      } else {
        if (!searchQuery || filteredList.some(f => f.id === item.id || (map[item.id]?.children?.length > 0))) {
             roots.push(map[item.id]);
        }
      }
    });

    return roots;
  };

  const accountData = buildHierarchy(accounts);

  const renderAccount = (account, level = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isOpen = openItems[account.id] || searchQuery; // Keep open during search

    return (
      <React.Fragment key={account.id}>
        <ListItem 
          disablePadding 
          sx={{ 
            pl: level * 4,
            mb: 0.5,
            borderRadius: 2,
            bgcolor: level === 0 ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.03) }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1.5, px: 2 }}>
            <IconButton 
              size="small" 
              onClick={() => toggleItem(account.id)}
              disabled={!hasChildren}
              sx={{ mr: 1, visibility: hasChildren ? 'visible' : 'hidden' }}
            >
              {isOpen ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
            
            <ListItemIcon sx={{ minWidth: 40 }}>
              {level === 0 ? <AccountBalance color="primary" /> : <Folder fontSize="small" color="secondary" />}
            </ListItemIcon>
            
            <ListItemText 
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" fontWeight="700" color="primary">{account.accountCode}</Typography>
                  <Typography variant="body1" fontWeight={level === 0 ? '700' : '500'}>{account.name}</Typography>
                </Box>
              } 
            />
            
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" fontWeight="700">
                {account.balance !== undefined ? `${account.balance.toLocaleString()} ${settings.Currency}` : ''}
              </Typography>
              {level === 0 && <Chip label={t(account.type.toLowerCase())} size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: 10, mt: 0.5 }} />}
            </Box>
          </Box>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            {account.children.map(child => renderAccount(child, level + 1))}
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              {t('chart_of_accounts')}
            </Typography>
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" color="inherit" href="/finance">{t('menu_financials')}</Link>
              <Typography color="text.primary">{t('chart_of_accounts')}</Typography>
            </Breadcrumbs>
          </Box>
          <PageHelp helpKey="chart_of_accounts" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
              size="small"
              placeholder={t('search_accounts')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mr: 2, bgcolor: 'background.paper', borderRadius: 1 }}
            />
          <TextField
            select
            size="small"
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            sx={{ minWidth: 150, mr: 2, bgcolor: 'background.paper', borderRadius: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterListIcon size="small" />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="">{t('all_warehouses', 'كافة المستودعات')}</MenuItem>
            {Array.isArray(warehouses) && warehouses.map(w => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => refetch()}>{t('sync')}</Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>{t('export')}</Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => setIsAddDialogOpen(true)}
          >
            {t('add_account')}
          </Button>
        </Box>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {t('error_loading_coa')}
        </Alert>
      )}

      <Paper 
        elevation={0}
        sx={{ 
          p: 2, 
          borderRadius: 4, 
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden'
        }}
      >
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {accountData.map(acc => renderAccount(acc))}
        </List>
      </Paper>

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('add_new_account')}</DialogTitle>
        <form onSubmit={handleAddAccount}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField 
                fullWidth 
                label={t('account_code')} 
                required 
                value={newAccount.accountCode}
                onChange={(e) => setNewAccount({...newAccount, accountCode: e.target.value})}
              />
              <TextField 
                fullWidth 
                label={t('account_name')} 
                required 
                value={newAccount.name}
                onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
              />
              <TextField 
                select 
                fullWidth 
                label={t('type') || "Type"} 
                value={newAccount.type}
                onChange={(e) => setNewAccount({...newAccount, type: e.target.value})}
              >
                {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(type => (
                  <MenuItem key={type} value={type}>{t(type.toLowerCase())}</MenuItem>
                ))}
              </TextField>
              <TextField 
                select 
                fullWidth 
                label={t('parent_account')} 
                value={newAccount.parentAccountId}
                onChange={(e) => setNewAccount({...newAccount, parentAccountId: e.target.value})}
              >
                <MenuItem value="">{t('none')}</MenuItem>
                {accounts?.filter(a => a.type === newAccount.type).map(acc => (
                  <MenuItem key={acc.id} value={acc.id}>{acc.accountCode} - {acc.name}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsAddDialogOpen(false)}>{t('cancel')}</Button>
            <Button 
                type="submit" 
                variant="contained" 
                loading={addAccountMutation.isPending}
            >
                {t('save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ChartOfAccounts;
