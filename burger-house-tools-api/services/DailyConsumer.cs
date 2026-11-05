using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using burger_house_tools_api.DTOs;
using Microsoft.Extensions.Hosting;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace burger_house_tools_api.Services;

public class DailyConsumer : BackgroundService
{
    private readonly IConfiguration _configuration;
    private const string QueueName = RabbitMqPublisher.DailyEventsQueueName;

    public DailyConsumer(IConfiguration configuration)
    {
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

                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    options.Converters.Add(new JsonStringEnumConverter());
                    var evt = JsonSerializer.Deserialize<DailyEventMessageDto>(message, options);

                    if (evt is not null)
                    {
                        Console.WriteLine(
                            $"[RabbitMQ - DailyConsumer] Evento '{evt.EventType}' processado | Diária #{evt.DailyId} | Funcionário: {evt.UserName} (#{evt.UserId}) | Data: {evt.Date:dd/MM/yyyy} | Pago: {evt.Paid} | Obs: '{evt.Notes}' | Por: {evt.PerformedBy}");
                    }

                    await Task.CompletedTask;
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
                Console.WriteLine($"[RabbitMQ - DailyConsumer] Aguardando RabbitMQ em '{hostName}': {ex.Message}");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }
}
