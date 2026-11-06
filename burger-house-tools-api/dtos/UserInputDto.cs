using burger_house_tools_api.Models.Enums;

namespace burger_house_tools_api.DTOs;

public class UserInputDto
{
    public string Name { get; set; }
    public string Login { get; set; }
    public string Password { get; set; }
    public UserRole UserRole { get; set; }
    public ContractType ContractType { get; set; }
    public decimal DailyRate { get; set; }
    public decimal DailyRateWkend { get; set; }
    public string Pix { get; set; }
}
