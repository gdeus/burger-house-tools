using burger_house_tools_api.Models.Enums;
using System.Text.Json.Serialization;

namespace burger_house_tools_api.DTOs;

public class UserResponseDto
{
    public int Id { get; set; }
    public string KeycloakId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public UserRole UserRole { get; set; }
    public ContractType ContractType { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? DailyRate { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? DailyRateWkend { get; set; }

    public string Pix { get; set; } = string.Empty;
}
