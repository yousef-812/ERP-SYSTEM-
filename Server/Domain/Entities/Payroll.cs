using System;

namespace ERP.Api.Domain.Entities
{
    public class Payroll
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid EmployeeId { get; set; }
        public Employee? Employee { get; set; }
        
        public int Month { get; set; } // 1-12
        public int Year { get; set; }
        
        public decimal BasicSalary { get; set; }
        public decimal Bonus { get; set; } = 0;
        public decimal Deductions { get; set; } = 0;
        
        // New HR Fields
        public decimal SocialInsurance { get; set; } = 0;
        public decimal IncomeTax { get; set; } = 0;

        public int PresentDays { get; set; } = 0;
        public int AbsentDays { get; set; } = 0;
        public int LeaveDays { get; set; } = 0;
        
        // Calculated Property: NetSalary
        public decimal NetSalary { get; set; }
        
        public string Status { get; set; } = "Draft"; // Draft, Paid
        public DateTime? PaymentDate { get; set; }
        public string? Remarks { get; set; }
    }
}
