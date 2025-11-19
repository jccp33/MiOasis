using MiOasisApi.Data;
using MiOasisApi.Models;
using System.Linq;

public static class DbInitializer
{
    public static void Seed(AppDbContext context)
    {
        // Asegura que la base de datos esté creada (necesario si no usas migraciones)
        context.Database.EnsureCreated();

        // 1. Seed de Planes de Suscripción
        if (!context.SubscriptionPlans.Any())
        {
            context.SubscriptionPlans.AddRange(
                new SubscriptionPlan { PlanName = "Basico", PriceMonthly = 0m, MaxAssetsAllowed = 10, MaxPolyCount = 5000, MaxTextureSizeMB = 50.0f },
                new SubscriptionPlan { PlanName = "Esencial", PriceMonthly = 100m, MaxAssetsAllowed = 20, MaxPolyCount = 20000, MaxTextureSizeMB = 500.0f },
                new SubscriptionPlan { PlanName = "Plus", PriceMonthly = 200m, MaxAssetsAllowed = 40, MaxPolyCount = 50000, MaxTextureSizeMB = 500.0f },
                new SubscriptionPlan { PlanName = "Avanzado", PriceMonthly = 400m, MaxAssetsAllowed = 150, MaxPolyCount = 100000, MaxTextureSizeMB = 500.0f }
            );
        }

        // 2. Seed de Tipos de Moneda
        if (!context.CurrencyTypes.Any())
        {
            context.CurrencyTypes.AddRange(
                new CurrencyType { Name = "Gold", Abbreviation = "G", IsPremium = false },
                new CurrencyType { Name = "Gems", Abbreviation = "GM", IsPremium = true }
            );
        }

        // 3. Seed de Configuraciones de Mundo (Lobby y Editor)
        if (!context.WorldConfigs.Any())
        {
            context.WorldConfigs.AddRange(
                new WorldConfig { WorldName = "Lobby Principal", MapSceneName = "MainLobbyScene", ParamGravity = 9.8f, ParamSizeX = 1000.0f, ParamSizeY = 1000.0f, ParamPhysicsMode = "Standard" },
                new WorldConfig { WorldName = "Avatar Editor", MapSceneName = "EditorScene", ParamGravity = 0.0f, ParamSizeX = 10.0f, ParamSizeY = 10.0f, ParamPhysicsMode = "None" }
            );
        }

        context.SaveChanges();
        // Nota: El seeding de usuarios debe ir en una lógica separada para no crear duplicados.
    }
}
