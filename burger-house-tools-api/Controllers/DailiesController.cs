using System.Globalization;
using burger_house_tools_api.DTOs;
using burger_house_tools_api.Models;
using burger_house_tools_api.Models.Enums;
using burger_house_tools_api.Services;
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
    private readonly RabbitMqPublisher _publisher;

    public DailiesController(AppDbContext context, RabbitMqPublisher publisher)
    {
        _context = context;
        _publisher = publisher;
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

        var isWeekend = IsWeekend(input.Date);
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

        await PublishDailyEventAsync("DailyCreated", daily, user.Name);

        var canViewValues = User.IsInRole("Admin");
        return CreatedAtAction(nameof(GetById), new { id = daily.Id }, MapToDto(daily, user, canViewValues));
    }

    [HttpPost("batch")]
    [HttpPost("multiple")]
    [Authorize(Roles = "Admin,Caixa")]
    public async Task<IActionResult> CreateBatch([FromBody] DailyBatchInputDto input)
    {
        var distinctUserIds = input.UserIds?.Distinct().ToList() ?? new List<int>();
        if (distinctUserIds.Count == 0)
        {
            return BadRequest(new { message = "At least one userId must be provided." });
        }

        var users = await _context.Users
            .Where(u => distinctUserIds.Contains(u.Id))
            .ToListAsync();

        if (users.Count != distinctUserIds.Count)
        {
            var foundIds = users.Select(u => u.Id).ToHashSet();
            var missingIds = distinctUserIds.Where(id => !foundIds.Contains(id));
            return NotFound(new { message = $"Users not found: {string.Join(", ", missingIds)}." });
        }

        var existingUserIds = await _context.Dailies
            .Where(d => d.Date == input.Date && distinctUserIds.Contains(d.UserId))
            .Select(d => d.UserId)
            .ToListAsync();

        var existingSet = existingUserIds.ToHashSet();
        var usersToRegister = users.Where(u => !existingSet.Contains(u.Id)).ToList();

        if (usersToRegister.Count == 0)
        {
            return BadRequest(new { message = "Daily shift already registered for all selected users on this date." });
        }

        var isWeekend = IsWeekend(input.Date);
        var createdDailies = new List<Daily>();

        foreach (var user in usersToRegister)
        {
            var calculatedValue = isWeekend ? user.DailyRateWkend : user.DailyRate;
            var daily = new Daily
            {
                UserId = user.Id,
                Date = input.Date,
                Value = calculatedValue,
                Paid = input.Paid,
                Notes = input.Notes
            };

            _context.Dailies.Add(daily);
            createdDailies.Add(daily);
        }

        await _context.SaveChangesAsync();

        var usersById = usersToRegister.ToDictionary(u => u.Id);
        foreach (var daily in createdDailies)
        {
            await PublishDailyEventAsync("DailyCreated", daily, usersById[daily.UserId].Name);
        }

        var canViewValues = User.IsInRole("Admin");
        var response = createdDailies
            .Select(d => MapToDto(d, usersById[d.UserId], canViewValues))
            .ToList();

        return Ok(response);
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

    [HttpGet("weekly-summary")]
    [Authorize(Roles = "Admin,Caixa")]
    public async Task<IActionResult> GetWeeklySummary(
        [FromQuery] int? year,
        [FromQuery] int? week,
        [FromQuery] DateOnly? date,
        [FromQuery] int? userId)
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

        return Ok(await BuildUserSummaryResponseAsync(
            periodTitle: $"Week {weekNumber} - {startOfWeek.Year} ({startOfWeek:dd/MM} to {endOfWeek:dd/MM})",
            startDate: startOfWeek,
            endDate: endOfWeek,
            advanceContractFilter: ContractType.Freelancer,
            userId: userId));
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

    [HttpGet("monthly-summary")]
    [Authorize(Roles = "Admin,Caixa")]
    public async Task<IActionResult> GetMonthlySummary(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] int? userId)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var targetMonth = month ?? DateTime.UtcNow.Month;

        var startDate = new DateOnly(targetYear, targetMonth, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var monthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(targetMonth);

        return Ok(await BuildUserSummaryResponseAsync(
            periodTitle: $"{monthName} / {targetYear}",
            startDate: startDate,
            endDate: endDate,
            advanceContractFilter: ContractType.Clt,
            userId: userId));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Caixa")]
    public async Task<IActionResult> Update(int id, [FromBody] DailyUpdateDto input)
    {
        var daily = await _context.Dailies
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (daily is null)
        {
            return NotFound(new { message = "Daily shift not found." });
        }

        daily.Notes = input.Notes;
        await _context.SaveChangesAsync();

        await PublishDailyEventAsync("DailyNotesUpdated", daily, daily.User.Name);

        var canViewValues = User.IsInRole("Admin");
        return Ok(MapToDto(daily, daily.User, canViewValues));
    }

    [HttpPatch("{id}/pay")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetPaidStatus(int id, [FromQuery] bool paid = true)
    {
        var daily = await _context.Dailies
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (daily is null)
        {
            return NotFound(new { message = "Daily shift not found." });
        }

        daily.Paid = paid;
        await _context.SaveChangesAsync();

        await PublishDailyEventAsync("DailyPaidStatusChanged", daily, daily.User.Name);

        return NoContent();
    }

    [HttpPatch("payWeek")]
    [HttpPatch("pay-week")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> PayWeek(
        [FromQuery] int userId,
        [FromQuery] int? week,
        [FromQuery] int? year,
        [FromQuery] DateOnly? date,
        [FromQuery] bool paid = true)
    {
        if (userId <= 0)
        {
            return BadRequest(new { message = "UserId is required." });
        }

        DateOnly startOfWeek;

        if (week.HasValue)
        {
            var targetYear = year ?? DateTime.UtcNow.Year;
            var dt = ISOWeek.ToDateTime(targetYear, week.Value, DayOfWeek.Monday);
            startOfWeek = DateOnly.FromDateTime(dt);
        }
        else if (date.HasValue)
        {
            var diff = (7 + (date.Value.DayOfWeek - DayOfWeek.Monday)) % 7;
            startOfWeek = date.Value.AddDays(-diff);
        }
        else
        {
            return BadRequest(new { message = "Week or date parameter is required." });
        }

        var endOfWeek = startOfWeek.AddDays(6);

        var dailies = await _context.Dailies
            .Include(d => d.User)
            .Where(d => d.UserId == userId && d.Date >= startOfWeek && d.Date <= endOfWeek)
            .ToListAsync();

        if (dailies.Count == 0)
        {
            return NotFound(new { message = "No daily shifts found for this user in the specified week." });
        }

        foreach (var daily in dailies)
        {
            daily.Paid = paid;
        }

        await _context.SaveChangesAsync();

        foreach (var daily in dailies)
        {
            await PublishDailyEventAsync("DailyWeekPaidStatusChanged", daily, daily.User.Name);
        }

        return Ok(new
        {
            message = paid
                ? "All daily shifts for this employee in the week marked as paid."
                : "All daily shifts for this employee in the week marked as pending.",
            userId,
            startDate = startOfWeek,
            endDate = endOfWeek,
            updatedCount = dailies.Count,
            paid
        });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var daily = await _context.Dailies
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (daily is null)
        {
            return NotFound(new { message = "Daily shift not found." });
        }

        var userName = daily.User.Name;
        _context.Dailies.Remove(daily);
        await _context.SaveChangesAsync();

        await PublishDailyEventAsync("DailyDeleted", daily, userName);

        return NoContent();
    }

    private Task PublishDailyEventAsync(string eventType, Daily daily, string userName)
    {
        var performedBy = User.Identity?.Name
            ?? User.FindFirst("preferred_username")?.Value
            ?? "unknown";

        return _publisher.PublishAsync(RabbitMqPublisher.DailyEventsQueueName, new DailyEventMessageDto
        {
            EventType = eventType,
            DailyId = daily.Id,
            UserId = daily.UserId,
            UserName = userName,
            Date = daily.Date,
            Value = daily.Value,
            Paid = daily.Paid,
            Notes = daily.Notes,
            PerformedBy = performedBy,
            OccurredAtUtc = DateTime.UtcNow
        });
    }

    private async Task<WeeklyUserSummaryResponseDto> BuildUserSummaryResponseAsync(
        string periodTitle,
        DateOnly startDate,
        DateOnly endDate,
        ContractType advanceContractFilter,
        int? userId)
    {
        var canViewValues = User.IsInRole("Admin");

        // No resumo semanal: exibe apenas funcionários Freelancer.
        // No resumo mensal: exibe apenas funcionários CLT.
        var dailiesQuery = _context.Dailies
            .Include(d => d.User)
            .Where(d => d.Date >= startDate && d.Date <= endDate && d.User.ContractType == advanceContractFilter);

        var advancesQuery = _context.Advances
            .Include(a => a.User)
            .Where(a => a.Date >= startDate && a.Date <= endDate && a.User.ContractType == advanceContractFilter);

        if (userId.HasValue)
        {
            dailiesQuery = dailiesQuery.Where(d => d.UserId == userId.Value);
            advancesQuery = advancesQuery.Where(a => a.UserId == userId.Value);
        }

        var dailies = await dailiesQuery
            .OrderBy(d => d.Date)
            .ToListAsync();

        var advances = await advancesQuery
            .OrderBy(a => a.Date)
            .ThenBy(a => a.Id)
            .ToListAsync();

        var usersById = new Dictionary<int, User>();
        foreach (var d in dailies)
        {
            usersById[d.UserId] = d.User;
        }
        foreach (var a in advances)
        {
            usersById[a.UserId] = a.User;
        }

        var usersSummary = usersById.Values
            .Select(user =>
            {
                var userDailies = dailies.Where(d => d.UserId == user.Id).ToList();
                var userAdvances = advances.Where(a => a.UserId == user.Id).ToList();

                var weekendCount = userDailies.Count(d => IsWeekend(d.Date));
                var weekdayCount = userDailies.Count - weekendCount;
                var paidCount = userDailies.Count(d => d.Paid);
                var pendingCount = userDailies.Count - paidCount;

                var userAdvancesTotal = userAdvances.Sum(a => a.Value);
                var rawTotalValue = userDailies.Sum(d => d.Value);
                var rawTotalPaid = userDailies.Where(d => d.Paid).Sum(d => d.Value);
                var rawTotalPending = userDailies.Where(d => !d.Paid).Sum(d => d.Value);

                return new UserWeeklySummaryDto
                {
                    UserId = user.Id,
                    UserName = user.Name,
                    Login = user.Login,
                    UserRole = user.UserRole,
                    ContractType = user.ContractType,
                    Pix = user.Pix,
                    DailyRate = canViewValues ? user.DailyRate : null,
                    DailyRateWkend = canViewValues ? user.DailyRateWkend : null,
                    TotalDailies = userDailies.Count,
                    WeekdayDailies = weekdayCount,
                    WeekendDailies = weekendCount,
                    PaidDailies = paidCount,
                    PendingDailies = pendingCount,
                    AdvancesCount = userAdvances.Count,
                    TotalAdvances = userAdvancesTotal,
                    TotalValue = canViewValues ? rawTotalValue - userAdvancesTotal : null,
                    TotalPaid = canViewValues ? rawTotalPaid : null,
                    TotalPending = canViewValues ? rawTotalPending - userAdvancesTotal : null,
                    Dailies = userDailies.Select(d => MapToDto(d, user, canViewValues)).ToList(),
                    Advances = userAdvances.Select(a => MapAdvanceToDto(a, user)).ToList()
                };
            })
            .OrderBy(u => u.UserName)
            .ToList();

        var totalAdvancesSum = advances.Sum(a => a.Value);
        var periodDailiesValue = dailies.Sum(d => d.Value);
        var periodDailiesPaid = dailies.Where(d => d.Paid).Sum(d => d.Value);
        var periodDailiesPending = dailies.Where(d => !d.Paid).Sum(d => d.Value);

        return new WeeklyUserSummaryResponseDto
        {
            Period = periodTitle,
            StartDate = startDate,
            EndDate = endDate,
            TotalDailiesCount = dailies.Count,
            TotalAdvancesCount = advances.Count,
            TotalAdvances = totalAdvancesSum,
            TotalValue = canViewValues ? periodDailiesValue - totalAdvancesSum : null,
            TotalPaid = canViewValues ? periodDailiesPaid : null,
            TotalPending = canViewValues ? periodDailiesPending - totalAdvancesSum : null,
            Users = usersSummary
        };
    }

    private async Task<DailyPeriodResponseDto> BuildPeriodResponseAsync(string periodTitle, string mode, DateOnly startDate, DateOnly endDate)
    {
        var canViewValues = User.IsInRole("Admin");
        var advanceContractFilter = mode == "Monthly" ? ContractType.Clt : ContractType.Freelancer;

        var dailies = await _context.Dailies
            .Include(d => d.User)
            .Where(d => d.Date >= startDate && d.Date <= endDate)
            .OrderBy(d => d.Date)
            .ToListAsync();

        var advances = await _context.Advances
            .Include(a => a.User)
            .Where(a => a.Date >= startDate && a.Date <= endDate && a.User.ContractType == advanceContractFilter)
            .OrderBy(a => a.Date)
            .ThenBy(a => a.Id)
            .ToListAsync();

        var daysList = new List<DailyDaySummaryDto>();

        for (var d = startDate; d <= endDate; d = d.AddDays(1))
        {
            var isWeekend = IsWeekend(d);
            var dayDailies = dailies
                .Where(x => x.Date == d)
                .Select(x => MapToDto(x, x.User, canViewValues))
                .ToList();

            var dayAdvances = advances
                .Where(a => a.Date == d)
                .Select(a => MapAdvanceToDto(a, a.User))
                .ToList();

            var dayAdvancesTotal = dayAdvances.Sum(a => a.Value);
            decimal? dayTotal = canViewValues
                ? dayDailies.Sum(x => x.Value ?? 0)
                : null;

            daysList.Add(new DailyDaySummaryDto
            {
                Date = d,
                DayOfWeek = d.DayOfWeek.ToString(),
                IsWeekend = isWeekend,
                Dailies = dayDailies,
                Advances = dayAdvances,
                DayAdvancesTotal = dayAdvancesTotal,
                DayTotal = dayTotal
            });
        }

        var totalAdvancesSum = advances.Sum(a => a.Value);
        decimal? totalValue = canViewValues ? dailies.Sum(d => d.Value) - totalAdvancesSum : null;
        decimal? totalPaid = canViewValues ? dailies.Where(d => d.Paid).Sum(d => d.Value) : null;
        decimal? totalPending = canViewValues ? dailies.Where(d => !d.Paid).Sum(d => d.Value) - totalAdvancesSum : null;

        return new DailyPeriodResponseDto
        {
            Period = periodTitle,
            Mode = mode,
            StartDate = startDate,
            EndDate = endDate,
            Days = daysList,
            TotalAdvances = totalAdvancesSum,
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

    private static AdvanceResponseDto MapAdvanceToDto(Advance advance, User user)
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

    private static bool IsWeekend(DateOnly date) =>
        date.DayOfWeek is DayOfWeek.Friday or DayOfWeek.Saturday or DayOfWeek.Sunday;
}
