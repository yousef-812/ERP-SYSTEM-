using ERP.Api.Domain.Entities;
using ERP.Api.Services.Interfaces;

namespace ERP.Api.Services
{
    public interface ITaxService
    {
        void CalculateInvoiceTax(Invoice invoice);
        string GetZatcaTlv(Invoice invoice, string sellerName, string vatNumber);
    }

    public class TaxService : ITaxService
    {
        private readonly IEInvoiceProvider _eInvoiceProvider;

        public TaxService(IEInvoiceProvider eInvoiceProvider)
        {
            _eInvoiceProvider = eInvoiceProvider;
        }

        public void CalculateInvoiceTax(Invoice invoice)
        {
            // Tax: 15% VAT (WAC calculation basis if it was inventory, 
            // but for Invoice we use Subtotal * TaxPercentage)
            invoice.TotalTaxAmount = Math.Round(invoice.Amount * (invoice.TaxPercentage / 100), 2, MidpointRounding.AwayFromZero);
            invoice.TotalAmountInclTax = invoice.Amount + invoice.TotalTaxAmount;
        }

        public string GetZatcaTlv(Invoice invoice, string sellerName, string vatNumber)
        {
            return _eInvoiceProvider.GenerateQrCodeTlv(
                sellerName, 
                vatNumber, 
                invoice.InvoiceDate, 
                invoice.TotalAmountInclTax, 
                invoice.TotalTaxAmount
            );
        }
    }
}
