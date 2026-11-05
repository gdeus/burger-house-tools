using System.Net.Http.Headers;
using System.Text.Json;
using burger_house_tools_api.DTOs;

namespace burger_house_tools_api.Services;

public class KeycloakService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public KeycloakService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    /// <summary>
    /// Realiza o login do usuário no Keycloak via Direct Access Grants (Resource Owner Password Credentials).
    /// </summary>
    public async Task<LoginResponseDto?> LoginAsync(string username, string password)
    {
        var authority = _configuration["Keycloak:Authority"]!;
        var clientId = _configuration["Keycloak:ClientId"]!;
        var clientSecret = _configuration["Keycloak:ClientSecret"];

        var parameters = new List<KeyValuePair<string, string>>
        {
            new("grant_type", "password"),
            new("client_id", clientId),
            new("username", username),
            new("password", password)
        };

        if (!string.IsNullOrWhiteSpace(clientSecret))
        {
            parameters.Add(new("client_secret", clientSecret));
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{authority}/protocol/openid-connect/token")
        {
            Content = new FormUrlEncodedContent(parameters)
        };

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        return await response.Content.ReadFromJsonAsync<LoginResponseDto>();
    }

    /// <summary>
    /// Obtém um token de admin do Keycloak para chamar a Admin REST API.
    /// </summary>
    private async Task<string> GetAdminTokenAsync()
    {
        var baseUrl = _configuration["Keycloak:Authority"]!.Replace("/realms/burger-house", "");

        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "client_credentials"),
            new KeyValuePair<string, string>("client_id", _configuration["Keycloak:AdminClientId"]!),
            new KeyValuePair<string, string>("client_secret", _configuration["Keycloak:AdminClientSecret"]!),
        });

        var response = await _httpClient.PostAsync(
            $"{baseUrl}/realms/burger-house/protocol/openid-connect/token", content);

        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("access_token").GetString()!;
    }

    /// <summary>
    /// Cria um usuário no Keycloak com login, senha e role.
    /// Retorna o ID do usuário criado no Keycloak.
    /// </summary>
    public async Task<string> CreateUserAsync(string username, string password, string roleName)
    {
        var token = await GetAdminTokenAsync();
        var baseUrl = _configuration["Keycloak:Authority"]!.Replace("/realms/burger-house", "");
        var adminUrl = $"{baseUrl}/admin/realms/burger-house";

        // 1. Criar o usuário no Keycloak
        var userPayload = new
        {
            username = username,
            enabled = true,
            credentials = new[]
            {
                new
                {
                    type = "password",
                    value = password,
                    temporary = false
                }
            }
        };

        using var createRequest = new HttpRequestMessage(HttpMethod.Post, $"{adminUrl}/users")
        {
            Content = JsonContent.Create(userPayload)
        };
        createRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var createResponse = await _httpClient.SendAsync(createRequest);
        if (createResponse.StatusCode != System.Net.HttpStatusCode.Conflict)
        {
            createResponse.EnsureSuccessStatusCode();
        }

        // 2. Buscar o ID do usuário recém-criado
        using var searchRequest = new HttpRequestMessage(HttpMethod.Get, $"{adminUrl}/users?username={username}&exact=true");
        searchRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var searchResponse = await _httpClient.SendAsync(searchRequest);
        searchResponse.EnsureSuccessStatusCode();

        var users = await searchResponse.Content.ReadFromJsonAsync<JsonElement[]>();
        var keycloakUserId = users![0].GetProperty("id").GetString()!;

        // 3. Buscar a representação da role
        using var roleRequest = new HttpRequestMessage(HttpMethod.Get, $"{adminUrl}/roles/{roleName}");
        roleRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var roleResponse = await _httpClient.SendAsync(roleRequest);
        roleResponse.EnsureSuccessStatusCode();

        var role = await roleResponse.Content.ReadFromJsonAsync<JsonElement>();

        // 4. Atribuir a role ao usuário
        var rolePayload = new[]
        {
            new
            {
                id = role.GetProperty("id").GetString(),
                name = role.GetProperty("name").GetString()
            }
        };

        using var assignRequest = new HttpRequestMessage(HttpMethod.Post, $"{adminUrl}/users/{keycloakUserId}/role-mappings/realm")
        {
            Content = JsonContent.Create(rolePayload)
        };
        assignRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var assignResponse = await _httpClient.SendAsync(assignRequest);
        assignResponse.EnsureSuccessStatusCode();

        return keycloakUserId;
    }
}
