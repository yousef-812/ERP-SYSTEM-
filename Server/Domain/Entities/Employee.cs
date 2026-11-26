using System;
using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class Employee
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }

        public Guid? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }
        
        public string? PhotoUrl { get; set; }
        
        [MaxLength(100)]
        public string Position { get; set; } = "Staff";
        public string? PositionEn { get; set; }
        
        [MaxLength(100)]
        public string Department { get; set; } = "General";
        public string? DepartmentEn { get; set; }
        
        public DateTime JoiningDate { get; set; } = DateTime.UtcNow;
        
        public decimal BasicSalary { get; set; }
        
        public string Status { get; set; } = "Active"; // Active, Terminated, OnLeave
        
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
    }
}
