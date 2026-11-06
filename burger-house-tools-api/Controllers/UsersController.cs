using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using burger_house_tools_api.Models;
using burger_house_tools_api.DTOs;
using burger_house_tools_api.Services;

namespace burger_house_tools_api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly RabbitMqPublisher _publisher;

    public UsersController(AppDbContext context, RabbitMqPublisher publisher)
    {
        _context = context;
        _publisher = publisher;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Caixa,Garcom")]
    public async Task<IActionResult> GetAll()
    {
        var canViewDailyRate = User.IsInRole("Admin");
        var users = await _context.Users.AsNoTracking().ToListAsync();
        var response = users.Select(u => MapToResponseDto(u, canViewDailyRate));
        return Ok(response);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Caixa,Garcom")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _context.Users.FindAsync(id);
        
        if (user is null) 
            return NotFound(new { message = "Usuario não encontrado." });
            
        var canViewDailyRate = User.IsInRole("Admin");
        return Ok(MapToResponseDto(user, canViewDailyRate));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] UserInputDto input)
    {
        var loginExists = await _context.Users.AnyAsync(u => u.Login == input.Login);
        if (loginExists)
        {
            return BadRequest(new { message = "Já existe um usuário com este login." });
        }

        // 1. Salva os dados de negócio na tabela local imediatamente (garante resposta rápida para o Frontend)
        var user = new User
        {
            KeycloakId = string.Empty,
            Name = input.Name,
            Login = input.Login,
            Password = input.Password,
            UserRole = input.UserRole,
            ContractType = input.ContractType,
            DailyRate = input.DailyRate,
            DailyRateWkend = input.DailyRateWkend,
            Pix = input.Pix
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // 2. Publica na fila do RabbitMQ para o UserConsumer provisionar no Keycloak em background
        await _publisher.PublishAsync(RabbitMqPublisher.UserQueueName, new UserQueueMessageDto
        {
            UserId = user.Id,
            Name = user.Name,
            Login = user.Login,
            Password = user.Password,
            UserRole = user.UserRole,
            ContractType = user.ContractType,
            DailyRate = user.DailyRate,
            DailyRateWkend = user.DailyRateWkend,
            Pix = user.Pix
        });

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, MapToResponseDto(user, true));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UserInputDto input)
    {
        var user = await _context.Users.FindAsync(id);
        
        if (user is null) 
            return NotFound(new { message = "Usuario não encontrado." });

        user.Name = input.Name;
        user.Login = input.Login;
        user.Password = input.Password;
        user.UserRole = input.UserRole;
        user.ContractType = input.ContractType;
        user.DailyRate = input.DailyRate;
        user.DailyRateWkend = input.DailyRateWkend;
        user.Pix = input.Pix;

        await _context.SaveChangesAsync();
        
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _context.Users.FindAsync(id);
        
        if (user is null) 
            return NotFound(new { message = "Usuário não encontrado." });

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        
        return NoContent();
    }

    private static UserResponseDto MapToResponseDto(User user, bool canViewDailyRate)
    {
        return new UserResponseDto
        {
            Id = user.Id,
            KeycloakId = user.KeycloakId,
            Name = user.Name,
            Login = user.Login,
            UserRole = user.UserRole,
            ContractType = user.ContractType,
            DailyRate = canViewDailyRate ? user.DailyRate : null,
            DailyRateWkend = canViewDailyRate ? user.DailyRateWkend : null,
            Pix = user.Pix
        };
    }
}
