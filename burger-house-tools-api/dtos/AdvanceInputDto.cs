namespace burger_house_tools_api.DTOs;

public class AdvanceInputDto
{
    public int UserId { get; set; }
    public decimal Value { get; set; }
    public DateOnly Date { get; set; }
    public string? Notes { get; set; }
}
