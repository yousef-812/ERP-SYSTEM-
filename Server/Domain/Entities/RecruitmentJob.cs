using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class RecruitmentJob
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Department { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string JobType { get; set; } = "Full-time"; // Part-time, Remote, Contract

        [Required]
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Requirements { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active"; // Active, Closed, On Hold

        [Required]
        [MaxLength(100)]
        public string Location { get; set; } = "Cairo";

        public DateTime PostedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(200)]
        public string? ExperienceLevel { get; set; } // Entry, Senior, Lead

        public List<JobApplication> Applications { get; set; } = new();
    }

    public class JobApplication
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid JobId { get; set; }
        public RecruitmentJob? Job { get; set; }

        [Required]
        [MaxLength(100)]
        public string CandidateName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Applied"; // Screening, Interview, Offered, Rejected

        [MaxLength(500)]
        public string? CV_Path { get; set; }

        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    }
}
