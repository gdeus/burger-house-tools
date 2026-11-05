using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using burger_house_tools_api.DTOs;
using burger_house_tools_api.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace burger_house_tools_api.Services;

public class UserConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private const string QueueName = RabbitMqPublisher.UserQueueName;

    public UserConsumer(IServiceScopeFactory scopeFactory, IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var hostName = _configuration["RabbitMq:HostName"] ?? "localhost";
        var factory = new ConnectionFactory { HostName = hostName };

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var connection = await factory.CreateConnectionAsync(stoppingToken);
                using var channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);

                await channel.QueueDeclareAsync(
                    queue: QueueName,
                    durable: false,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null,
                    cancellationToken: stoppingToken);

                var consumer = new AsyncEventingBasicConsumer(channel);

                consumer.ReceivedAsync += async (model, ea) =>
                {
                    var body = ea.Body.ToArray();
                    var message = Encoding.UTF8.GetString(body);

                    Console.WriteLine($"[RabbitMQ - UserConsumer] Mensagem recebida: {message}");

                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    options.Converters.Add(new JsonStringEnumConverter());
                    var input = JsonSerializer.Deserialize<UserQueueMessageDto>(message, options);

                    if (input is null)
                    {
                        return;
                    }

                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        var keycloakService = scope.ServiceProvider.GetRequiredService<KeycloakService>();

                        var keycloakId = await keycloakService.CreateUserAsync(
                            input.Login, input.Password, input.UserRole.ToString());

                        if (input.UserId.HasValue)
                        {
                            var existingUser = await dbContext.Users.FindAsync(new object[] { input.UserId.Value }, stoppingToken);
                            if (existingUser is not null)
                            {
                                existingUser.KeycloakId = keycloakId;
                                await dbContext.SaveChangesAsync(stoppingToken);
                                Console.WriteLine($"[RabbitMQ - UserConsumer] Usuário '{existingUser.Name}' (#{existingUser.Id}) provisionado no Keycloak ({keycloakId}) com sucesso!");
                                return;
                            }
                        }

                        var user = new User
                        {
                            KeycloakId = keycloakId,
                            Name = input.Name,
                            Login = input.Login,
                            Password = input.Password,
                            UserRole = input.UserRole,
                            DailyRate = input.DailyRate,
                            DailyRateWkend = input.DailyRateWkend,
                            Pix = input.Pix
                        };

                        dbContext.Users.Add(user);
                        await dbContext.SaveChangesAsync(stoppingToken);

                        Console.WriteLine($"[RabbitMQ - UserConsumer] Usuário '{user.Name}' criado no Keycloak e persistido no banco com sucesso!");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[RabbitMQ - UserConsumer] Erro ao processar usuário '{input.Login}': {ex.Message}");
                    }
                };

                await channel.BasicConsumeAsync(queue: QueueName, autoAck: true, consumer: consumer, cancellationToken: stoppingToken);

                await Task.Delay(Timeout.Infinite, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RabbitMQ - UserConsumer] Aguardando RabbitMQ em '{hostName}': {ex.Message}");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }
}
