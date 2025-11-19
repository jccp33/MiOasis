using Microsoft.EntityFrameworkCore;
using MiOasisApi.Models;

namespace MiOasisApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<SubscriptionPlan> SubscriptionPlans { get; set; } = null!;
        public DbSet<UserAsset> UserAssets { get; set; } = null!;
        public DbSet<PlayerAssetInventory> PlayerAssetInventories { get; set; } = null!;
        public DbSet<AvatarConfig> AvatarConfigs { get; set; } = null!;
        public DbSet<AvatarAssetMapping> AvatarAssetMappings { get; set; } = null!;
        public DbSet<WorldConfig> WorldConfigs { get; set; } = null!;
        public DbSet<WorldInstance> WorldInstances { get; set; } = null!;
        public DbSet<UserFriendship> UserFriendships { get; set; } = null!;
        public DbSet<CurrencyType> CurrencyTypes { get; set; } = null!;
        public DbSet<UserBalance> UserBalances { get; set; } = null!;

        // --- Configuración de Relaciones y Restricciones ---
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Relación User <-> SubscriptionPlan
            modelBuilder.Entity<User>()
                .HasOne(u => u.Plan)
                .WithMany(p => p.Users)
                .HasForeignKey(u => u.PlanId)
                .IsRequired(false);

            // 2. Relación User <-> UserAssets (IP Owner)
            modelBuilder.Entity<UserAsset>()
                .HasOne(ua => ua.IPOwner)
                .WithMany(u => u.CreatedAssets)
                .HasForeignKey(ua => ua.IPOwnerId)
                .OnDelete(DeleteBehavior.Restrict); // No se puede borrar el dueño si tiene assets creados

            // 3. Relación User <-> PlayerAssetInventory (Inventario de Copias)
            modelBuilder.Entity<PlayerAssetInventory>()
                .HasOne(pai => pai.User)
                .WithMany(u => u.InventoryItems)
                .HasForeignKey(pai => pai.UserId)
                .OnDelete(DeleteBehavior.Cascade); // Si el usuario se elimina, su inventario también.

            // 4. PlayerAssetInventory <-> UserAssets (Referencia al Maestro)
            modelBuilder.Entity<PlayerAssetInventory>()
                .HasOne(pai => pai.MasterAsset)
                .WithMany()
                .HasForeignKey(pai => pai.MasterAssetId)
                .OnDelete(DeleteBehavior.Restrict); // No eliminar el Maestro si hay copias en inventario.

            // 5. AvatarAssetMapping (Relaciones de Equipamiento)

            // Configs -> Mapping
            modelBuilder.Entity<AvatarAssetMapping>()
                .HasOne(m => m.Config)
                .WithMany(c => c.EquippedAssets)
                .HasForeignKey(m => m.ConfigId)
                .OnDelete(DeleteBehavior.Cascade); // Si se borra la configuración, se borra el mapeo.

            // Inventario -> Mapping
            modelBuilder.Entity<AvatarAssetMapping>()
                .HasOne(m => m.InventoryItem)
                .WithMany()
                .HasForeignKey(m => m.InventoryId)
                .OnDelete(DeleteBehavior.Restrict); // No borrar item del inventario si está equipado.

            // 6. World Configs
            modelBuilder.Entity<WorldInstance>()
                .HasOne(wi => wi.WorldConfig)
                .WithMany(wc => wc.ActiveInstances)
                .HasForeignKey(wi => wi.WorldId)
                .OnDelete(DeleteBehavior.Cascade);

            // 7. Índices Únicos
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            // 8. Relación UserFriendship
            modelBuilder.Entity<UserFriendship>()
                .HasOne(uf => uf.Requester)
                .WithMany() // No es necesario mapear la colección inversa en User
                .HasForeignKey(uf => uf.RequesterId)
                .OnDelete(DeleteBehavior.Restrict); // No eliminar usuario si tiene solicitudes pendientes

            modelBuilder.Entity<UserFriendship>()
                .HasOne(uf => uf.Target)
                .WithMany()
                .HasForeignKey(uf => uf.TargetId)
                .OnDelete(DeleteBehavior.Restrict);

            // 9. Relación UserBalance
            modelBuilder.Entity<UserBalance>()
                .HasOne(ub => ub.User)
                .WithMany()
                .HasForeignKey(ub => ub.UserId)
                .OnDelete(DeleteBehavior.Cascade); // Si el usuario se va, sus saldos también.

            modelBuilder.Entity<UserBalance>()
                .HasOne(ub => ub.CurrencyType)
                .WithMany()
                .HasForeignKey(ub => ub.CurrencyId)
                .OnDelete(DeleteBehavior.Restrict);

            // Restricción única: Un usuario solo puede tener un registro por tipo de moneda.
            modelBuilder.Entity<UserBalance>()
                .HasIndex(ub => new { ub.UserId, ub.CurrencyId })
                .IsUnique();

        }
    }
}
