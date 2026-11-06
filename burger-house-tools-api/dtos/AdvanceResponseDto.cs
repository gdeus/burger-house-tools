using burger_house_tools_api.Models.Enums;

namespace burger_house_tools_api.DTOs;

public class AdvanceResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public UserRole UserRole { get; set; }
    public ContractType ContractType { get; set; }
    public decimal Value { get; set; }
    public DateOnly Date { get; set; }
    public string? Notes { get; set; }
}
