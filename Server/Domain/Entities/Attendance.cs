using System;

namespace ERP.Api.Domain.Entities
{
    public class Attendance
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid EmployeeId { get; set; }
        public Employee? Employee { get; set; }
        
        public DateTime Date { get; set; }
        public string Status { get; set; } = "Present"; // Present, Absent, Leave
        public string? Notes { get; set; }
    }
}
