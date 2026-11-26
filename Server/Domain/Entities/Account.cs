using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class Account
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(20)]
        public string AccountCode { get; set; } = string.Empty; // e.g., 1001, 4001

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // e.g., Cash, Sales, Salaries

        [MaxLength(20)]
        public string Type { get; set; } = "Asset"; // Asset, Liability, Equity, Revenue, Expense

        public decimal Balance { get; set; }

        // Hierarchy
        public Guid? ParentAccountId { get; set; }
        public Account? ParentAccount { get; set; }
        public List<Account> ChildAccounts { get; set; } = new();

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }

    public class JournalEntry
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string Reference { get; set; } = string.Empty; // e.g., INV-001, PO-001

        public DateTime Date { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(10)]
        public string Currency { get; set; } = "EGP"; // Multi-currency (text-only)

        public bool IsLocked { get; set; } = false; // Immutable ledger flag
        
        public Guid? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public List<JournalEntryLine> Lines { get; set; } = new();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class JournalEntryLine
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid JournalEntryId { get; set; }
        public JournalEntry? JournalEntry { get; set; }

        public Guid AccountId { get; set; }
        public Account? Account { get; set; }

        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
    }
}
