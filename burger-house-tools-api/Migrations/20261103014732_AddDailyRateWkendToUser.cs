using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace burger_house_tools_api.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyRateWkendToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DailyRateWkend",
                table: "Users",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DailyRateWkend",
                table: "Users");
        }
    }
}
