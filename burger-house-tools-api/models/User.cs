using burger_house_tools_api.Models.Enums;

namespace burger_house_tools_api.Models;

public class User{
    public int Id { get; set; }
    public string KeycloakId { get; set; }
    public String Name { get; set; }
    public String Login { get; set; }
    public String Password { get; set; }
    public UserRole UserRole { get; set; }
    public ContractType ContractType { get; set; }
    public decimal DailyRate { get; set; }
    public decimal DailyRateWkend { get; set; }
    public string Pix { get; set; }
}
