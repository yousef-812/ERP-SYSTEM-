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
    public class SuppliersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SuppliersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Supplier>>> GetSuppliers()
        {
            var authService = HttpContext.RequestServices.GetRequiredService<IAuthorizationService>();
            var isProcurementCreator = (await authService.AuthorizeAsync(User, AppPermissions.Procurement_CreatePO)).Succeeded;
            var isProcurementViewer = (await authService.AuthorizeAsync(User, AppPermissions.Procurement_ViewPO)).Succeeded;
            var isSupplierViewer = (await authService.AuthorizeAsync(User, AppPermissions.Procurement_ViewSuppliers)).Succeeded;

            if (!isProcurementCreator && !isProcurementViewer && !isSupplierViewer && !User.IsInRole("Admin"))
                return Forbid();

            return await _context.Suppliers.OrderBy(s => s.Name).ToListAsync();
        }

        // GET: api/Suppliers/5
        [HasPermission(AppPermissions.Procurement_ViewSuppliers)]
        [HttpGet("{id}")]
        public async Task<ActionResult<Supplier>> GetSupplier(Guid id)
        {
            var supplier = await _context.Suppliers.FindAsync(id);

            if (supplier == null)
                return NotFound();

            return supplier;
        }

        // POST: api/Suppliers
        [HasPermission(AppPermissions.Procurement_ManageSuppliers)]
        [HttpPost]
        public async Task<ActionResult<Supplier>> CreateSupplier(Supplier supplier)
        {
            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSupplier), new { id = supplier.Id }, supplier);
        }

        // PUT: api/Suppliers/5
        [HasPermission(AppPermissions.Procurement_ManageSuppliers)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSupplier(Guid id, Supplier supplier)
        {
            if (id != supplier.Id)
                return BadRequest();

            _context.Entry(supplier).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SupplierExists(id))
                    return NotFound();
                else
                    throw;
            }

            return NoContent();
        }

        // DELETE: api/Suppliers/5
        [HasPermission(AppPermissions.Procurement_ManageSuppliers)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSupplier(Guid id)
        {
            var supplier = await _context.Suppliers.FindAsync(id);
            if (supplier == null)
                return NotFound();

            _context.Suppliers.Remove(supplier);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool SupplierExists(Guid id)
        {
            return _context.Suppliers.Any(e => e.Id == id);
        }
    }
}
