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
    public class AppraisalsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AppraisalsController(AppDbContext context)
        {
            _context = context;
        }

        [HasPermission(AppPermissions.HR_ViewAppraisals, AppPermissions.HR_ManageAppraisals)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Appraisal>>> GetAppraisals()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var query = _context.Appraisals.Include(a => a.Employee).AsQueryable();

            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                query = query.Where(a => a.Employee.WarehouseId.HasValue && assignedWarehouseIds.Contains(a.Employee.WarehouseId.Value));
            }

            return await query.OrderByDescending(a => a.ReviewDate).ToListAsync();
        }

        [HasPermission(AppPermissions.HR_ManageAppraisals)]
        [HttpPost]
        public async Task<ActionResult<Appraisal>> CreateAppraisal(Appraisal appraisal)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                var emp = await _context.Employees.FindAsync(appraisal.EmployeeId);
                if (emp == null || !emp.WarehouseId.HasValue || !assignedWarehouseIds.Contains(emp.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لإضافة تقييم لموظف خارج مستودعاتك.");
            }

            _context.Appraisals.Add(appraisal);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAppraisals), new { id = appraisal.Id }, appraisal);
        }

        [HasPermission(AppPermissions.HR_ManageAppraisals)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAppraisal(Guid id, Appraisal appraisal)
        {
            if (id != appraisal.Id) return BadRequest();

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                var emp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == appraisal.EmployeeId);
                if (emp == null || !emp.WarehouseId.HasValue || !assignedWarehouseIds.Contains(emp.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لتعديل تقييم لموظف خارج مستودعاتك.");
            }

            _context.Entry(appraisal).State = EntityState.Modified;
            
            try 
            {
                await _context.SaveChangesAsync();
            } 
            catch (DbUpdateConcurrencyException) 
            {
                if (!_context.Appraisals.Any(e => e.Id == id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        [HasPermission(AppPermissions.HR_ManageAppraisals)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAppraisal(Guid id)
        {
            var appraisal = await _context.Appraisals.Include(a => a.Employee).FirstOrDefaultAsync(a => a.Id == id);
            if (appraisal == null) return NotFound();

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                if (appraisal.Employee == null || !appraisal.Employee.WarehouseId.HasValue || !assignedWarehouseIds.Contains(appraisal.Employee.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لحذف تقييم لموظف خارج مستودعاتك.");
            }

            _context.Appraisals.Remove(appraisal);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
