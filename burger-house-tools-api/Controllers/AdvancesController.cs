using burger_house_tools_api.DTOs;
using burger_house_tools_api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace burger_house_tools_api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Caixa")]
public class AdvancesController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdvancesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? userId,
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] int? year,
        [FromQuery] int? month)
    {
        var query = _context.Advances
            .AsNoTracking()
            .Include(a => a.User)
            .AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }

        if (year.HasValue && month.HasValue)
        {
            var firstDay = new DateOnly(year.Value, month.Value, 1);
            var lastDay = firstDay.AddMonths(1).AddDays(-1);
            query = query.Where(a => a.Date >= firstDay && a.Date <= lastDay);
        }
        else
        {
            if (startDate.HasValue)
            {
                query = query.Where(a => a.Date >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(a => a.Date <= endDate.Value);
            }
        }

        var advances = await query
            .OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.Id)
            .ToListAsync();

        var response = advances.Select(a => MapToResponseDto(a, a.User)).ToList();
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var advance = await _context.Advances
            .AsNoTracking()
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (advance is null)
        {
            return NotFound(new { message = "Advance not found." });
        }

        return Ok(MapToResponseDto(advance, advance.User));
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetByUser(int userId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
        {
            return NotFound(new { message = "User not found." });
        }

        var advances = await _context.Advances
            .AsNoTracking()
            .Include(a => a.User)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.Id)
            .ToListAsync();

        var response = advances.Select(a => MapToResponseDto(a, a.User)).ToList();
        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdvanceInputDto input)
    {
        var user = await _context.Users.FindAsync(input.UserId);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (input.Value <= 0)
        {
            return BadRequest(new { message = "Advance value must be greater than zero." });
        }

        var advance = new Advance
        {
            UserId = input.UserId,
            Value = input.Value,
            Date = input.Date,
            Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim()
        };

        _context.Advances.Add(advance);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = advance.Id }, MapToResponseDto(advance, user));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AdvanceInputDto input)
    {
        var advance = await _context.Advances.FindAsync(id);
        if (advance is null)
        {
            return NotFound(new { message = "Advance not found." });
        }

        var user = await _context.Users.FindAsync(input.UserId);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (input.Value <= 0)
        {
            return BadRequest(new { message = "Advance value must be greater than zero." });
        }

        advance.UserId = input.UserId;
        advance.Value = input.Value;
        advance.Date = input.Date;
        advance.Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim();

        await _context.SaveChangesAsync();

        return Ok(MapToResponseDto(advance, user));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var advance = await _context.Advances.FindAsync(id);
        if (advance is null)
        {
            return NotFound(new { message = "Advance not found." });
        }

        _context.Advances.Remove(advance);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static AdvanceResponseDto MapToResponseDto(Advance advance, User user)
    {
        return new AdvanceResponseDto
        {
            Id = advance.Id,
            UserId = advance.UserId,
            UserName = user.Name,
            UserRole = user.UserRole,
            ContractType = user.ContractType,
            Value = advance.Value,
            Date = advance.Date,
            Notes = advance.Notes
        };
    }
}
