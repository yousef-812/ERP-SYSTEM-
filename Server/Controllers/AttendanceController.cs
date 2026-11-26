using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AttendanceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AttendanceController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Attendance?date=2024-03-30
        [HasPermission(AppPermissions.HR_ViewAttendance, AppPermissions.HR_RecordAttendance)]
        [HttpGet]
        public async Task<IActionResult> GetAttendanceByDate(DateTime? date)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var searchDate = date?.Date ?? DateTime.UtcNow.Date;

            var empQuery = _context.Employees
                .Include(e => e.Warehouse)
                .Where(e => e.Status == "Active" || e.Status == "OnLeave");
            
            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                empQuery = empQuery.Where(e => e.WarehouseId.HasValue && assignedWarehouseIds.Contains(e.WarehouseId.Value));
            }

            var employeesList = await empQuery.ToListAsync();
            var employeeIds = employeesList.Select(e => e.Id).ToList();

            var attendanceLogs = await _context.Attendance
                .Where(a => a.Date.Date == searchDate && employeeIds.Contains(a.EmployeeId))
                .ToListAsync();

            var result = employeesList.Select(e => new {
                e.Id,
                e.Name,
                e.Position,
                WarehouseName = e.Warehouse?.Name ?? "---",
                Status = attendanceLogs.FirstOrDefault(a => a.EmployeeId == e.Id)?.Status ?? "Not Logged",
                Notes = attendanceLogs.FirstOrDefault(a => a.EmployeeId == e.Id)?.Notes ?? ""
            });

            return Ok(result);
        }

        // Logs or updates attendance for a specific employee on a specific date
        // Note: Prevents overwriting once status is 'Present', 'Absent' or 'Leave'
        // Note: Prevents logging for future dates
        [HasPermission(AppPermissions.HR_RecordAttendance)]
        [HttpPost]
        public async Task<IActionResult> LogAttendance([FromBody] LogAttendanceDto dto)
        {
            if (dto.Date.Date > DateTime.UtcNow.Date)
            {
                return BadRequest("Cannot log attendance for future dates.");
            }

            var existing = await _context.Attendance
                .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date.Date == dto.Date.Date);

            if (existing != null)
            {
                // Lock: If already logged as Present, Absent or Leave, don't allow changes
                if (existing.Status == "Present" || existing.Status == "Absent" || existing.Status == "Leave")
                {
                    return BadRequest("Attendance status already locked for this day.");
                }

                existing.Status = dto.Status;
                existing.Notes = dto.Notes;
                _context.Attendance.Update(existing);
            }
            else
            {
                var attendance = new Attendance
                {
                    EmployeeId = dto.EmployeeId,
                    Date = dto.Date.Date,
                    Status = dto.Status,
                    Notes = dto.Notes
                };
                _context.Attendance.Add(attendance);
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        // POST: api/Attendance/bulk
        // Logs attendance for multiple employees at once
        // Note: Prevents logging for future dates
        [HasPermission(AppPermissions.HR_RecordAttendance)]
        [HttpPost("bulk")]
        public async Task<IActionResult> BulkLogAttendance([FromBody] List<LogAttendanceDto> logs)
        {
            if (logs.Any(l => l.Date.Date > DateTime.UtcNow.Date))
            {
                return BadRequest("Cannot log attendance for future dates.");
            }

            foreach (var dto in logs)
            {
                var existing = await _context.Attendance
                    .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date.Date == dto.Date.Date);

                if (existing != null)
                {
                    // Lock: SKIP update if already logged
                    if (existing.Status == "Present" || existing.Status == "Absent" || existing.Status == "Leave")
                    {
                        continue;
                    }

                    existing.Status = dto.Status;
                    existing.Notes = dto.Notes;
                    _context.Attendance.Update(existing);
                }
                else
                {
                    _context.Attendance.Add(new Attendance {
                        EmployeeId = dto.EmployeeId,
                        Date = dto.Date.Date,
                        Status = dto.Status,
                        Notes = dto.Notes
                    });
                }
            }
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
