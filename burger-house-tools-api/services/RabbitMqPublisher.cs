using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using RabbitMQ.Client;

namespace burger_house_tools_api.Services;

public class RabbitMqPublisher
{
    public const string UserQueueName = "new_user_queue";
    public const string DailyEventsQueueName = "daily_events_queue";

    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        Converters = { new JsonStringEnumConverter() }
    };

    public RabbitMqPublisher(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task PublishAsync<T>(string queueName, T payload)
    {
        try
        {
            var hostName = _configuration["RabbitMq:HostName"] ?? "localhost";
            var factory = new ConnectionFactory { HostName = hostName };

            await using var connection = await factory.CreateConnectionAsync();
            await using var channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(
                queue: queueName,
                durable: false,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            var json = JsonSerializer.Serialize(payload, JsonOptions);
            var body = Encoding.UTF8.GetBytes(json);

            await channel.BasicPublishAsync(
                exchange: string.Empty,
                routingKey: queueName,
                body: body);

            Console.WriteLine($"[RabbitMQ Publisher] Mensagem publicada na fila '{queueName}': {json}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RabbitMQ Publisher] Falha ao publicar na fila '{queueName}': {ex.Message}");
        }
    }
}
