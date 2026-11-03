using burger_house_tools_api.Models.Enums;
using System.Text.Json.Serialization;

namespace burger_house_tools_api.DTOs;

public class DailyResponseDto
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public UserRole UserRole { get; set; }
    public bool Paid { get; set; }
    public string? Notes { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? Value { get; set; }
}
