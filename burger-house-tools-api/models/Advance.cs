namespace burger_house_tools_api.Models;

public class Advance
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public decimal Value { get; set; }
    public DateOnly Date { get; set; }
    public string? Notes { get; set; }
}
