using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;
        private readonly AppDbContext _context;

        public DocumentsController(IWebHostEnvironment environment, AppDbContext context)
        {
            _environment = environment;
            _context = context;
        }

        [HasPermission(AppPermissions.System_ManageDocuments)]
        [HttpPost("upload")]
        public async Task<IActionResult> UploadDocument([FromForm] IFormFile file, [FromForm] string displayName, [FromForm] string category, [FromForm] Guid? warehouseId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var uploadsPath = Path.Combine(_environment.ContentRootPath, "wwwroot", "uploads");
            if (!Directory.Exists(uploadsPath))
                Directory.CreateDirectory(uploadsPath);

            // Generate a unique filename to avoid collisions
            var uniqueFileName = $"{Guid.NewGuid()}_{file.FileName}";
            var filePath = Path.Combine(uploadsPath, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Save Metadata to DB
            var metadata = new DocumentMetadata
            {
                FileName = uniqueFileName,
                DisplayName = string.IsNullOrEmpty(displayName) ? file.FileName : displayName,
                Category = string.IsNullOrEmpty(category) ? "General" : category,
                FileSize = file.Length,
                FileExtension = Path.GetExtension(file.FileName).TrimStart('.').ToUpper(),
                UploadDate = DateTime.UtcNow,
                WarehouseId = warehouseId,
                UploadedBy = User.Identity?.Name ?? "Admin"
            };

            _context.DocumentMetadata.Add(metadata);
            await _context.SaveChangesAsync();

            return Ok(metadata);
        }

        [HasPermission(AppPermissions.System_ManageDocuments)]
        [HttpGet]
        public async Task<IActionResult> GetDocuments([FromQuery] string? category, [FromQuery] string? warehouseId)
        {
            var query = _context.DocumentMetadata.AsQueryable();
            
            if (!string.IsNullOrEmpty(category) && category != "All") {
                query = query.Where(d => d.Category == category);
            }

            if (!string.IsNullOrEmpty(warehouseId)) {
                if (warehouseId == "all") {
                    // Don't filter by warehouse
                } else if (warehouseId == "null") {
                    query = query.Where(d => d.WarehouseId == null);
                } else if (Guid.TryParse(warehouseId, out Guid wId)) {
                    query = query.Where(d => d.WarehouseId == wId);
                }
            } else {
                // Default behavior: show General (WarehouseId == null)
                query = query.Where(d => d.WarehouseId == null);
            }

            var docs = await query.OrderByDescending(d => d.UploadDate).ToListAsync();
            return Ok(docs);
        }

        [HasPermission(AppPermissions.System_ManageDocuments)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(Guid id)
        {
            var doc = await _context.DocumentMetadata.FindAsync(id);
            if (doc == null) return NotFound();

            // Delete physical file
            var filePath = Path.Combine(_environment.ContentRootPath, "wwwroot", "uploads", doc.FileName);
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }

            _context.DocumentMetadata.Remove(doc);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Document deleted successfully" });
        }

        [HasPermission(AppPermissions.System_ManageDocuments)]
        [HttpPatch("{id}/rename")]
        public async Task<IActionResult> RenameDocument(Guid id, [FromBody] string newDisplayName)
        {
            var doc = await _context.DocumentMetadata.FindAsync(id);
            if (doc == null) return NotFound();

            doc.DisplayName = newDisplayName;
            await _context.SaveChangesAsync();

            return Ok(doc);
        }
    }
}
