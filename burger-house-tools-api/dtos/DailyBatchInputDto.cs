namespace burger_house_tools_api.DTOs;

public class DailyBatchInputDto
{
    public List<int> UserIds { get; set; } = new();
    public DateOnly Date { get; set; }
    public bool Paid { get; set; } = false;
    public string? Notes { get; set; }
}
