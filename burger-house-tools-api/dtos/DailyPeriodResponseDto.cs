using System.Text.Json.Serialization;

namespace burger_house_tools_api.DTOs;

public class DailyDaySummaryDto
{
    public DateOnly Date { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;
    public bool IsWeekend { get; set; }
    public List<DailyResponseDto> Dailies { get; set; } = new();
    public List<AdvanceResponseDto> Advances { get; set; } = new();
    public decimal DayAdvancesTotal { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? DayTotal { get; set; }
}

public class DailyPeriodResponseDto
{
    public string Period { get; set; } = string.Empty;
    public string Mode { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public List<DailyDaySummaryDto> Days { get; set; } = new();
    public decimal TotalAdvances { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TotalValue { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TotalPaid { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TotalPending { get; set; }
}
