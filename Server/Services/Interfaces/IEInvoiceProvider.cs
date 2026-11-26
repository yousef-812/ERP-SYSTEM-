namespace ERP.Api.Services.Interfaces
{
    public interface IEInvoiceProvider
    {
        string GenerateQrCodeTlv(string sellerName, string vatNumber, DateTime timestamp, decimal totalAmount, decimal vatAmount);
    }
}
