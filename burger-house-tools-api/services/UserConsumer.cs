using burger_house_tools_api.DTOs;
using burger_house_tools_api.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace burger_house_tools_api.Services;

public class UserConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private const string QueueName = "new_user_queue";

    public UserConsumer(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory { HostName = "localhost" };

        using var connection = await factory.CreateConnectionAsync(stoppingToken);
        using var channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);

        await channel.QueueDeclareAsync(queue: QueueName, durable: false, exclusive: false, autoDelete: false, arguments: null, cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);

        

        consumer.ReceivedAsync += async (model, ea) =>
        {
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);

            Console.WriteLine($"[RabbitMQ] Mensagem recebida: {message}");

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            options.Converters.Add(new JsonStringEnumConverter());
            var input = JsonSerializer.Deserialize<UserInputDto>(message, options);

            if (input != null)
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var user = new User
                {
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

                Console.WriteLine($"[RabbitMQ] User {user.Name} persistido no banco com sucesso!");
            }
        };

        await channel.BasicConsumeAsync(queue: QueueName, autoAck: true, consumer: consumer, cancellationToken: stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}