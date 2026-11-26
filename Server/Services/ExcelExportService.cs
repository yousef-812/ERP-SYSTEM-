using ClosedXML.Excel;
using System.Data;

namespace ERP.Api.Services
{
    public interface IExcelExportService
    {
        byte[] ExportToExcel<T>(IEnumerable<T> data, string sheetName);
    }

    public class ExcelExportService : IExcelExportService
    {
        public byte[] ExportToExcel<T>(IEnumerable<T> data, string sheetName)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add(sheetName);

            // Use reflection to get properties
            var type = typeof(T);
            if (type == typeof(object) && data.Any())
            {
                type = data.First().GetType();
            }

            var properties = type.GetProperties()
                .Where(p => p.PropertyType.IsPrimitive || 
                            p.PropertyType == typeof(string) || 
                            p.PropertyType == typeof(decimal) || 
                            p.PropertyType == typeof(DateTime) ||
                            p.PropertyType == typeof(Guid) ||
                            Nullable.GetUnderlyingType(p.PropertyType) != null)
                .ToList();

            // Add Headers
            for (int i = 0; i < properties.Count; i++)
            {
                worksheet.Cell(1, i + 1).Value = properties[i].Name;
                worksheet.Cell(1, i + 1).Style.Font.Bold = true;
                worksheet.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#1976d2");
                worksheet.Cell(1, i + 1).Style.Font.FontColor = XLColor.White;
            }

            // Add Data
            var row = 2;
            foreach (var item in data)
            {
                for (int i = 0; i < properties.Count; i++)
                {
                    var value = properties[i].GetValue(item);
                    worksheet.Cell(row, i + 1).Value = XLCellValue.FromObject(value);
                }
                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }
    }
}
