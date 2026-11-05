using System.Text.Json.Serialization;
using burger_house_tools_api.Models.Enums;

namespace burger_house_tools_api.DTOs;

public class UserWeeklySummaryDto
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public UserRole UserRole { get; set; }
    public string Pix { get; set; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? DailyRate { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? DailyRateWkend { get; set; }

    public int TotalDailies { get; set; }
    public int WeekdayDailies { get; set; }
    public int WeekendDailies { get; set; }
    public int PaidDailies { get; set; }
    public int PendingDailies { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TotalValue { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TotalPaid { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TotalPending { get; set; }

    public List<DailyResponseDto> Dailies { get; set; } = new();
}

public class WeeklyUserSummaryResponseDto
{
    public string Period { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int TotalDailiesCount { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TotalValue { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TotalPaid { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TotalPending { get; set; }

    public List<UserWeeklySummaryDto> Users { get; set; } = new();
}
