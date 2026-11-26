using System.Text;
using ERP.Api.Services.Interfaces;

namespace ERP.Api.Services
{
    public class ZatcaEInvoiceProvider : IEInvoiceProvider
    {
        public string GenerateQrCodeTlv(string sellerName, string vatNumber, DateTime timestamp, decimal totalAmount, decimal vatAmount)
        {
            var tlvData = new List<byte>();

            tlvData.AddRange(EncodeTlv(1, sellerName));
            tlvData.AddRange(EncodeTlv(2, vatNumber));
            tlvData.AddRange(EncodeTlv(3, timestamp.ToString("yyyy-MM-ddTHH:mm:ssZ")));
            tlvData.AddRange(EncodeTlv(4, totalAmount.ToString("F2")));
            tlvData.AddRange(EncodeTlv(5, vatAmount.ToString("F2")));

            return Convert.ToBase64String(tlvData.ToArray());
        }

        private byte[] EncodeTlv(byte tag, string value)
        {
            var valueBytes = Encoding.UTF8.GetBytes(value);
            var tlv = new byte[2 + valueBytes.Length];
            tlv[0] = tag;
            tlv[1] = (byte)valueBytes.Length;
            Array.Copy(valueBytes, 0, tlv, 2, valueBytes.Length);
            return tlv;
        }
    }
}
