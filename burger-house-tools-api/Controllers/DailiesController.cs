using System.Globalization;
using burger_house_tools_api.DTOs;
using burger_house_tools_api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace burger_house_tools_api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DailiesController : ControllerBase
{
    private readonly AppDbContext _context;

    public DailiesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Caixa")]
    public async Task<IActionResult> Create([FromBody] DailyInputDto input)
    {
        var user = await _context.Users.FindAsync(input.UserId);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        var exists = await _context.Dailies.AnyAsync(d => d.UserId == input.UserId && d.Date == input.Date);
        if (exists)
        {
            return BadRequest(new { message = "Daily shift already registered for this user on this date." });
        }

        var isWeekend = input.Date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
        var calculatedValue = isWeekend ? user.DailyRateWkend : user.DailyRate;

        var daily = new Daily
        {
            UserId = input.UserId,
            Date = input.Date,
            Value = calculatedValue,
            Paid = input.Paid,
            Notes = input.Notes
        };

        _context.Dailies.Add(daily);
        await _context.SaveChangesAsync();

        var canViewValues = User.IsInRole("Admin");
        return CreatedAtAction(nameof(GetById), new { id = daily.Id }, MapToDto(daily, user, canViewValues));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Caixa")]
    public async Task<IActionResult> GetById(int id)
    {
        var daily = await _context.Dailies
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (daily is null)
        {
            return NotFound(new { message = "Daily shift not found." });
        }

        var canViewValues = User.IsInRole("Admin");
        return Ok(MapToDto(daily, daily.User, canViewValues));
    }

    [HttpGet("weekly")]
    [Authorize(Roles = "Admin,Caixa")]
    public async Task<IActionResult> GetWeekly([FromQuery] int? year, [FromQuery] int? week, [FromQuery] DateOnly? date)
    {
        DateOnly startOfWeek;

        if (year.HasValue && week.HasValue)
        {
            var dt = ISOWeek.ToDateTime(year.Value, week.Value, DayOfWeek.Monday);
            startOfWeek = DateOnly.FromDateTime(dt);
        }
        else if (date.HasValue)
        {
            var diff = (7 + (date.Value.DayOfWeek - DayOfWeek.Monday)) % 7;
            startOfWeek = date.Value.AddDays(-diff);
        }
        else
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
            startOfWeek = today.AddDays(-diff);
        }

        var endOfWeek = startOfWeek.AddDays(6);
        var weekNumber = ISOWeek.GetWeekOfYear(startOfWeek.ToDateTime(TimeOnly.MinValue));

        return Ok(await BuildPeriodResponseAsync(
            periodTitle: $"Week {weekNumber} - {startOfWeek.Year} ({startOfWeek:dd/MM} to {endOfWeek:dd/MM})",
            mode: "Weekly",
            startDate: startOfWeek,
            endDate: endOfWeek));
    }

    [HttpGet("monthly")]
    [Authorize(Roles = "Admin,Caixa")]
    public async Task<IActionResult> GetMonthly([FromQuery] int? year, [FromQuery] int? month)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var targetMonth = month ?? DateTime.UtcNow.Month;

        var startDate = new DateOnly(targetYear, targetMonth, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var monthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(targetMonth);

        return Ok(await BuildPeriodResponseAsync(
            periodTitle: $"{monthName} / {targetYear}",
            mode: "Monthly",
            startDate: startDate,
            endDate: endDate));
    }

    [HttpPatch("{id}/pay")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetPaidStatus(int id, [FromQuery] bool paid = true)
    {
        var daily = await _context.Dailies.FindAsync(id);
        if (daily is null)
        {
            return NotFound(new { message = "Daily shift not found." });
        }

        daily.Paid = paid;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var daily = await _context.Dailies.FindAsync(id);
        if (daily is null)
        {
            return NotFound(new { message = "Daily shift not found." });
        }

        _context.Dailies.Remove(daily);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<DailyPeriodResponseDto> BuildPeriodResponseAsync(string periodTitle, string mode, DateOnly startDate, DateOnly endDate)
    {
        var canViewValues = User.IsInRole("Admin");

        var dailies = await _context.Dailies
            .Include(d => d.User)
            .Where(d => d.Date >= startDate && d.Date <= endDate)
            .OrderBy(d => d.Date)
            .ToListAsync();

        var daysList = new List<DailyDaySummaryDto>();

        for (var d = startDate; d <= endDate; d = d.AddDays(1))
        {
            var isWeekend = d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
            var dayDailies = dailies
                .Where(x => x.Date == d)
                .Select(x => MapToDto(x, x.User, canViewValues))
                .ToList();

            decimal? dayTotal = canViewValues ? dayDailies.Sum(x => x.Value ?? 0) : null;

            daysList.Add(new DailyDaySummaryDto
            {
                Date = d,
                DayOfWeek = d.DayOfWeek.ToString(),
                IsWeekend = isWeekend,
                Dailies = dayDailies,
                DayTotal = dayTotal
            });
        }

        decimal? totalValue = canViewValues ? dailies.Sum(d => d.Value) : null;
        decimal? totalPaid = canViewValues ? dailies.Where(d => d.Paid).Sum(d => d.Value) : null;
        decimal? totalPending = canViewValues ? dailies.Where(d => !d.Paid).Sum(d => d.Value) : null;

        return new DailyPeriodResponseDto
        {
            Period = periodTitle,
            Mode = mode,
            StartDate = startDate,
            EndDate = endDate,
            Days = daysList,
            TotalValue = totalValue,
            TotalPaid = totalPaid,
            TotalPending = totalPending
        };
    }

    private static DailyResponseDto MapToDto(Daily daily, User user, bool canViewValues)
    {
        return new DailyResponseDto
        {
            Id = daily.Id,
            Date = daily.Date,
            UserId = daily.UserId,
            UserName = user.Name,
            UserRole = user.UserRole,
            Paid = daily.Paid,
            Notes = daily.Notes,
            Value = canViewValues ? daily.Value : null
        };
    }
}
