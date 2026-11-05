using System.Text.Json;
using System.Text.Json.Serialization;
using burger_house_tools_api.DTOs;
using burger_house_tools_api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace burger_house_tools_api.Services;

public class DatabaseSeeder : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;

    public DatabaseSeeder(IServiceScopeFactory scopeFactory, IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var initialUsersJson = _configuration["INITIAL_USERS_JSON"];
        if (string.IsNullOrWhiteSpace(initialUsersJson))
        {
            return;
        }

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        options.Converters.Add(new JsonStringEnumConverter());

        List<UserInputDto>? seedUsers;
        try
        {
            seedUsers = JsonSerializer.Deserialize<List<UserInputDto>>(initialUsersJson, options);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Seeder] Erro ao desserializar INITIAL_USERS_JSON: {ex.Message}");
            return;
        }

        if (seedUsers is null || seedUsers.Count == 0)
        {
            return;
        }

        // Aguarda o Keycloak e o Banco estarem prontos
        for (var attempt = 1; attempt <= 20 && !stoppingToken.IsCancellationRequested; attempt++)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var keycloak = scope.ServiceProvider.GetRequiredService<KeycloakService>();

                foreach (var item in seedUsers)
                {
                    var keycloakId = await keycloak.CreateUserAsync(
                        item.Login,
                        item.Password,
                        item.UserRole.ToString());

                    var existing = await db.Users.FirstOrDefaultAsync(u => u.Login == item.Login, stoppingToken);
                    if (existing is null)
                    {
                        db.Users.Add(new User
                        {
                            KeycloakId = keycloakId,
                            Name = item.Name,
                            Login = item.Login,
                            Password = item.Password,
                            UserRole = item.UserRole,
                            DailyRate = item.DailyRate,
                            DailyRateWkend = item.DailyRateWkend,
                            Pix = item.Pix
                        });
                        await db.SaveChangesAsync(stoppingToken);
                        Console.WriteLine($"[Seeder] Usuário inicial '{item.Name}' ({item.Login}) criado com sucesso.");
                    }
                    else if (string.IsNullOrEmpty(existing.KeycloakId))
                    {
                        existing.KeycloakId = keycloakId;
                        await db.SaveChangesAsync(stoppingToken);
                    }
                }

                Console.WriteLine("[Seeder] Todos os usuários iniciais foram sincronizados com sucesso!");
                return;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Seeder] Tentativa {attempt}/20 aguardando Keycloak/DB: {ex.Message}");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }
}
