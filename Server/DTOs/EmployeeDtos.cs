using System.ComponentModel.DataAnnotations;

namespace ERP.Api.DTOs
{
    public class CreateEmployeeDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Position { get; set; }
        public string? Department { get; set; }
        public decimal BasicSalary { get; set; }
        public Guid WarehouseId { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
    }

    public class LogAttendanceDto
    {
        [Required]
        public Guid EmployeeId { get; set; }
        [Required]
        public DateTime Date { get; set; }
        [Required]
        public string Status { get; set; } = "Present"; // Present, Absent, Leave
        public string? Notes { get; set; }
    }

    public class GeneratePayrollDto
    {
        [Required]
        [Range(1, 12)]
        public int Month { get; set; }
        [Required]
        public int Year { get; set; }
    }
}
