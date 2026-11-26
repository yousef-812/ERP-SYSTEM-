using Microsoft.EntityFrameworkCore;
using ERP.Api.DTOs;

namespace ERP.Api.Extensions
{
    public static class QueryableExtensions
    {
        public static async Task<PagedResult<T>> ToPagedListAsync<T>(this IQueryable<T> source, int pageNumber, int pageSize)
        {
            var count = await source.CountAsync();
            var items = await source.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();

            return new PagedResult<T>
            {
                TotalCount = count,
                PageSize = pageSize,
                PageNumber = pageNumber,
                Items = items
            };
        }
    }
}
