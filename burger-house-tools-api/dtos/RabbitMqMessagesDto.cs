using burger_house_tools_api.Models.Enums;

namespace burger_house_tools_api.DTOs;

public class UserQueueMessageDto
{
    public int? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public UserRole UserRole { get; set; }
    public ContractType ContractType { get; set; }
    public decimal DailyRate { get; set; }
    public decimal DailyRateWkend { get; set; }
    public string Pix { get; set; } = string.Empty;
}

public class DailyEventMessageDto
{
    public string EventType { get; set; } = string.Empty;
    public int DailyId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public decimal Value { get; set; }
    public bool Paid { get; set; }
    public string? Notes { get; set; }
    public string PerformedBy { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
}
