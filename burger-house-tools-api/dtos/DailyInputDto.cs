namespace burger_house_tools_api.DTOs;

public class DailyInputDto
{
    public int UserId { get; set; }
    public DateOnly Date { get; set; }
    public bool Paid { get; set; } = false;
    public string? Notes { get; set; }
}
