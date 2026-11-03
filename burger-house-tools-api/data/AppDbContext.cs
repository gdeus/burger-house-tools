using burger_house_tools_api.Models;
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<User> Users { get; set; }
    public DbSet<Daily> Dailies { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .Property(u => u.DailyRate)
            .HasPrecision(10, 2);

        modelBuilder.Entity<User>()
            .Property(u => u.DailyRateWkend)
            .HasPrecision(10, 2);

        modelBuilder.Entity<Daily>()
            .Property(d => d.Value)
            .HasPrecision(10, 2);

        modelBuilder.Entity<Daily>()
            .HasOne(d => d.User)
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
