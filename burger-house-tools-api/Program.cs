using burger_house_tools_api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuração do Banco de Dados (EF Core)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Configuração de Autenticação com Keycloak (JWT Bearer)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Keycloak:Authority"];
        options.RequireHttpsMetadata = false; // false para desenvolvimento local (HTTP)

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Keycloak:Authority"],
            ValidateAudience = false, // O Keycloak por padrão não emite o ClientId no claim 'aud'
            ValidateLifetime = true,
            RoleClaimType = "realm_roles"
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"[Auth Failure] {context.Exception.Message}");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// 3. Registra o uso de Controllers em vez de Minimal APIs
builder.Services.AddControllers().AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(null, false)));

// 4. Configuração do Swagger com o campo de Token (Authorize)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Adiciona o esquema de segurança Bearer
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Cole aqui o seu token JWT puro obtido no login"
    });

    options.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", doc),
            new List<string>()
        }
    });
});

// 5. Registra o Publisher e os serviços de background do RabbitMQ + Seeder
builder.Services.AddSingleton<RabbitMqPublisher>();
builder.Services.AddHostedService<UserConsumer>();
builder.Services.AddHostedService<DailyConsumer>();
builder.Services.AddHostedService<DatabaseSeeder>();

// 6. Registra o HttpClient e o KeycloakService
builder.Services.AddHttpClient<KeycloakService>();

var app = builder.Build();

// Aplica as migrações automaticamente na inicialização (com retry para aguardar o SQL Server no Docker)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    for (var attempt = 1; attempt <= 10; attempt++)
    {
        try
        {
            db.Database.Migrate();
            break;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Database Migration] Tentativa {attempt}/10 aguardando SQL Server: {ex.Message}");
            Thread.Sleep(3000);
        }
    }
}

// 7. Middlewares HTTP
app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

// 8. Mapeia as rotas para os Controllers criados
app.MapControllers();

app.Run();
