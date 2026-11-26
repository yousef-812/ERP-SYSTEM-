using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class HRManagementController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HRManagementController(AppDbContext context)
        {
            _context = context;
        }

        // --- Recruitment ---
        [HasPermission(AppPermissions.HR_Recruitment)]
        [HttpGet("jobs")]
        public async Task<ActionResult<IEnumerable<RecruitmentJob>>> GetJobs()
        {
            return await _context.RecruitmentJobs
                .Include(j => j.Applications)
                .OrderByDescending(j => j.PostedAt)
                .ToListAsync();
        }

        [HasPermission(AppPermissions.HR_Recruitment)]
        [HttpPost("jobs")]
        public async Task<ActionResult<RecruitmentJob>> CreateJob(RecruitmentJob job)
        {
            if (job == null) return BadRequest("Job data is required.");
            
            job.Id = Guid.NewGuid();
            job.PostedAt = DateTime.UtcNow;
            job.Applications = new List<JobApplication>();
            
            _context.RecruitmentJobs.Add(job);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetJobs), new { id = job.Id }, job);
        }

        [HasPermission(AppPermissions.HR_Recruitment)]
        [HttpPut("jobs/{id}")]
        public async Task<IActionResult> UpdateJob(Guid id, RecruitmentJob job)
        {
            if (id != job.Id) return BadRequest();

            _context.Entry(job).State = EntityState.Modified;
            
            try 
            {
                await _context.SaveChangesAsync();
            } 
            catch (DbUpdateConcurrencyException) 
            {
                if (!_context.RecruitmentJobs.Any(e => e.Id == id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        [HasPermission(AppPermissions.HR_Recruitment)]
        [HttpDelete("jobs/{id}")]
        public async Task<IActionResult> DeleteJob(Guid id)
        {
            var job = await _context.RecruitmentJobs.FindAsync(id);
            if (job == null) return NotFound();

            _context.RecruitmentJobs.Remove(job);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        [HasPermission(
            AppPermissions.HR_ViewDashboard, 
            AppPermissions.HR_ViewEmployees, 
            AppPermissions.HR_ManageEmployees,
            AppPermissions.HR_ViewAttendance,
            AppPermissions.HR_RecordAttendance,
            AppPermissions.HR_ViewPayroll,
            AppPermissions.HR_ProcessPayroll,
            AppPermissions.HR_Recruitment,
            AppPermissions.HR_ViewTimeOff,
            AppPermissions.HR_ManageTimeOff,
            AppPermissions.HR_ViewAppraisals,
            AppPermissions.HR_ManageAppraisals
        )]
        [HttpGet("dashboard-stats")]
        public async Task<ActionResult<object>> GetHRDashboardStats()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            var employeeQuery = _context.Employees.AsQueryable();
            var attendanceQuery = _context.Attendance.AsQueryable();
            var jobsQuery = _context.RecruitmentJobs.AsQueryable();
            var appraisalQuery = _context.Appraisals.Where(a => a.Status == "Pending").AsQueryable();
            var auditQuery = _context.AuditLogs.Where(a => a.EntityName == "Employee" || a.EntityName == "RecruitmentJob" || a.EntityName == "Appraisal").AsQueryable();

            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                
                employeeQuery = employeeQuery.Where(e => e.WarehouseId.HasValue && assignedWarehouseIds.Contains(e.WarehouseId.Value));
                attendanceQuery = attendanceQuery.Where(a => a.Employee.WarehouseId.HasValue && assignedWarehouseIds.Contains(a.Employee.WarehouseId.Value));
                // Jobs and Appraisals might need more complex filtering if they aren't directly linked to warehouses, 
                // but let's filter appraisals by employee warehouse as done before.
                appraisalQuery = appraisalQuery.Where(a => a.Employee.WarehouseId.HasValue && assignedWarehouseIds.Contains(a.Employee.WarehouseId.Value));
            }

            var totalEmployees = await employeeQuery.CountAsync();
            
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var todayAttendance = await attendanceQuery
                .Where(a => a.Date >= today && a.Date < tomorrow)
                .CountAsync();
            
            var attendanceRate = totalEmployees == 0 ? 0 : (todayAttendance * 100.0) / totalEmployees;
            var activeJobs = await jobsQuery.Where(j => j.Status == "Active").CountAsync();
            var pendingAppraisals = await appraisalQuery.CountAsync();

            var recentActivities = await auditQuery
                .OrderByDescending(a => a.CreatedAt)
                .Take(5)
                .Select(a => new {
                    Name = a.Username ?? "System",
                    Action = $"{a.Action} {a.EntityName}", 
                    Date = a.CreatedAt
                })
                .ToListAsync();

            // --- AUTO-SYNC EMPLOYEE STATUSES ---
            // This ensures statuses are correct every time the dashboard is loaded
            var activeLeaveEmployeeIds = await _context.TimeOffRequests
                .Where(r => r.Status == "Approved" && today >= r.StartDate.Date && today <= r.EndDate.Date)
                .Select(r => r.EmployeeId)
                .Distinct()
                .ToListAsync();

            var employeesToUpdate = await _context.Employees.ToListAsync();
            bool changed = false;
            foreach (var emp in employeesToUpdate)
            {
                var shouldBeOnLeave = activeLeaveEmployeeIds.Contains(emp.Id);
                if (shouldBeOnLeave && emp.Status == "Active")
                {
                    emp.Status = "OnLeave";
                    changed = true;
                }
                else if (!shouldBeOnLeave && emp.Status == "OnLeave")
                {
                    emp.Status = "Active";
                    changed = true;
                }
            }
            if (changed) await _context.SaveChangesAsync();
            // -----------------------------------

            return Ok(new {
                TotalEmployees = totalEmployees,
                AttendanceRate = Math.Round(attendanceRate, 1),
                ActiveJobs = activeJobs,
                PendingAppraisals = pendingAppraisals,
                RecentActivities = recentActivities
            });
        }

        // --- TIME OFF MANAGEMENT ---

        [HasPermission(AppPermissions.HR_ViewTimeOff, AppPermissions.HR_ManageTimeOff)]
        [HttpGet("time-off")]
        public async Task<ActionResult<IEnumerable<TimeOffRequest>>> GetTimeOffRequests()
        {
            var query = _context.TimeOffRequests.Include(t => t.Employee).AsQueryable();

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                query = query.Where(t => t.Employee.WarehouseId.HasValue && assignedWarehouseIds.Contains(t.Employee.WarehouseId.Value));
            }

            return await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        }

        [HasPermission(AppPermissions.HR_CreateTimeOff)]
        [HttpPost("time-off")]
        public async Task<ActionResult<TimeOffRequest>> CreateTimeOffRequest([FromBody] TimeOffRequest request)
        {
            request.Id = Guid.NewGuid();
            request.Status = "Pending";
            request.CreatedAt = DateTime.UtcNow;
            
            if (request.TotalDays <= 0)
            {
                request.TotalDays = (int)(request.EndDate - request.StartDate).TotalDays + 1;
            }

            _context.TimeOffRequests.Add(request);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTimeOffRequests), new { id = request.Id }, request);
        }

        [HasPermission(AppPermissions.HR_ManageTimeOff)]
        [HttpPut("time-off/{id}/approve")]
        public async Task<IActionResult> ApproveTimeOff(Guid id)
        {
            var request = await _context.TimeOffRequests.Include(r => r.Employee).FirstOrDefaultAsync(r => r.Id == id);
            if (request == null) return NotFound();

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                if (request.Employee == null || !request.Employee.WarehouseId.HasValue || !assignedWarehouseIds.Contains(request.Employee.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لقبول إجازة لموظف خارج مستودعاتك.");
            }

            if (request.Status != "Pending") return BadRequest("Request is already processed.");

            request.Status = "Approved";

            // 1. Update Employee Status ONLY if leave is currently active
            var today = DateTime.UtcNow.Date;
            if (request.Employee != null && today >= request.StartDate.Date && today <= request.EndDate.Date)
            {
                request.Employee.Status = "OnLeave";
            }

            // 2. Attendance Hook: Mark as "Leave" for the duration
            for (var date = request.StartDate.Date; date <= request.EndDate.Date; date = date.AddDays(1))
            {
                var attendance = await _context.Attendance
                    .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date.Date == date);

                if (attendance == null)
                {
                    attendance = new Attendance 
                    { 
                        Id = Guid.NewGuid(),
                        EmployeeId = request.EmployeeId,
                        Date = date,
                        Status = "Leave",
                        Notes = $"Approved {request.Type}: {request.Reason}"
                    };
                    _context.Attendance.Add(attendance);
                }
                else
                {
                    attendance.Status = "Leave";
                    attendance.Notes = $"Converted to Leave ({request.Type})";
                }
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HasPermission(AppPermissions.HR_ManageTimeOff)]
        [HttpPut("time-off/{id}/reject")]
        public async Task<IActionResult> RejectTimeOff(Guid id, [FromBody] string? managerNote)
        {
            var request = await _context.TimeOffRequests.Include(r => r.Employee).FirstOrDefaultAsync(r => r.Id == id);
            if (request == null) return NotFound();

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                if (request.Employee == null || !request.Employee.WarehouseId.HasValue || !assignedWarehouseIds.Contains(request.Employee.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لرفض إجازة لموظف خارج مستودعاتك.");
            }

            request.Status = "Rejected";
            request.ManagerNote = managerNote;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
