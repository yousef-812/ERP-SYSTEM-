import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Table, TableBody, 
  TableCell, TableHead, TableRow, Typography, Chip, 
  CircularProgress, Box, IconButton, useTheme
} from '@mui/material';
import { Close as CloseIcon, History as HistoryIcon } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URLS } from '../../api';

const StockHistoryDialog = ({ open, onClose, product }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    if (open && product?.id) {
      fetchHistory();
    }
  }, [open, product]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URLS.STOCK.HISTORY(product.id));
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching stock history:", err);
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeStyles = (type) => {
    switch (type) {
      case 0: return { label: 'Receiving', color: 'success' };
      case 1: return { label: 'Sale', color: 'error' };
      case 2: return { label: 'Adjustment', color: 'warning' };
      case 3: return { label: 'Return', color: 'info' };
      default: return { label: 'Unknown', color: 'default' };
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon />
          <Typography variant="h6">Stock History: {product?.name}</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Reference/Note</TableCell>
                <TableCell>Supplier</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length > 0 ? (
                history.map((move) => {
                  const styles = getMovementTypeStyles(move.type);
                  return (
                    <TableRow key={move.id} hover>
                      <TableCell>{format(new Date(move.movementDate), 'yyyy-MM-dd HH:mm')}</TableCell>
                      <TableCell>
                        <Chip 
                          label={styles.label} 
                          size="small" 
                          color={styles.color} 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: move.quantity > 0 ? 'success.main' : 'error.main' }}>
                        {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                      </TableCell>
                      <TableCell>{move.note}</TableCell>
                      <TableCell>{move.supplier?.name || '-'}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    No stock movements found for this product.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StockHistoryDialog;
