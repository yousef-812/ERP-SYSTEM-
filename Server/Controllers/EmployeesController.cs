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
    public class EmployeesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EmployeesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Employees
        [HasPermission(
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
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            var query = _context.Employees
                .Include(e => e.Warehouse)
                .AsQueryable();

            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                query = query.Where(e => e.WarehouseId.HasValue && assignedWarehouseIds.Contains(e.WarehouseId.Value));
            }

            return await query.OrderBy(e => e.Name).ToListAsync();
        }

        // POST: api/Employees
        [HasPermission(AppPermissions.HR_ManageEmployees)]
        [HttpPost]
        public async Task<ActionResult<Employee>> CreateEmployee([FromBody] CreateEmployeeDto dto)
        {
            var employee = new Employee
            {
                Name = dto.Name,
                Position = dto.Position ?? "Staff",
                Department = dto.Department ?? "General",
                BasicSalary = dto.BasicSalary,
                WarehouseId = dto.WarehouseId,
                Phone = dto.Phone,
                Email = dto.Email,
                Address = dto.Address,
                JoiningDate = DateTime.UtcNow,
                Status = "Active"
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEmployees), new { id = employee.Id }, employee);
        }

        // PUT: api/Employees/{id}
        [HasPermission(AppPermissions.HR_ManageEmployees)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEmployee(Guid id, [FromBody] Employee updated)
        {
            if (id != updated.Id) return BadRequest();

            // Validate Access
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                var existingEmp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
                if (existingEmp == null) return NotFound();
                
                if (!existingEmp.WarehouseId.HasValue || !assignedWarehouseIds.Contains(existingEmp.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لتعديل موظف خارج مستودعاتك.");
                
                if (updated.WarehouseId.HasValue && !assignedWarehouseIds.Contains(updated.WarehouseId.Value))
                    return StatusCode(403, "لا يمكنك نقل الموظف إلى مستودع لا تملك صلاحية عليه.");
            }

            _context.Entry(updated).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Employees.AnyAsync(e => e.Id == id)) return NotFound();
                throw;
            }

            return NoContent();
        }

        // DELETE: api/Employees/{id}
        [HasPermission(AppPermissions.HR_ManageEmployees)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployee(Guid id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                if (!employee.WarehouseId.HasValue || !assignedWarehouseIds.Contains(employee.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لحذف موظف خارج مستودعاتك.");
            }

            // Check if employee has associated records (Payroll, Attendance)
            // For now, allow deletion if no payroll exists
            var hasPayroll = await _context.Payrolls.AnyAsync(p => p.EmployeeId == id);
            if (hasPayroll) return BadRequest("Cannot delete employee with payroll records.");

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Employees/{id}/360
        [HasPermission(AppPermissions.HR_ViewEmployees)]
        [HttpGet("{id}/360")]
        public async Task<ActionResult<object>> GetEmployeeDetail(Guid id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                if (!employee.WarehouseId.HasValue || !assignedWarehouseIds.Contains(employee.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية للاطلاع على بيانات هذا الموظف.");
            }

            var attendanceSummary = await _context.Attendance
                .Where(a => a.EmployeeId == id)
                .OrderByDescending(a => a.Date)
                .Take(30) // Last 30 records
                .ToListAsync();

            var payrollHistory = await _context.Payrolls
                .Where(p => p.EmployeeId == id)
                .OrderByDescending(p => p.Year)
                .ThenByDescending(p => p.Month)
                .ToListAsync();

            return Ok(new
            {
                Employee = employee,
                Attendance = attendanceSummary,
                Payroll = payrollHistory
            });
        }
    }
}
