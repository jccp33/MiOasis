
-- =================================================================
-- 1. Tablas Centrales de Plataforma y Planificación
-- =================================================================

-- 1. SubscriptionPlans (Planes y Límites de UGC)
CREATE TABLE "SubscriptionPlans" (
    "PlanId" SERIAL PRIMARY KEY,
    "PlanName" VARCHAR(50) NOT NULL,
    "MaxAssetsAllowed" INTEGER NOT NULL,
    "MaxPolyCount" INTEGER NOT NULL,
    "MaxTextureSizeMB" REAL NOT NULL
);

-- 2. Users (Cuentas de Jugadores)
CREATE TABLE "Users" (
    "UserId" SERIAL PRIMARY KEY,
    "Username" VARCHAR(50) NOT NULL,
    "PasswordHash" VARCHAR(256) NOT NULL,
    "Email" VARCHAR(100),
    "PlanId" INTEGER, -- FK a SubscriptionPlans
    "Status" VARCHAR(20) DEFAULT 'active',
    "Role" VARCHAR(20) DEFAULT 'gamer',
    
    CONSTRAINT "UQ_Users_Username" UNIQUE ("Username"),
    
    CONSTRAINT "FK_Users_SubscriptionPlans_PlanId" FOREIGN KEY ("PlanId")
        REFERENCES "SubscriptionPlans" ("PlanId") ON DELETE SET NULL
);

-- =================================================================
-- 2. Tablas de Contenido Generado por Usuario (UGC) - Catálogo Maestro
-- =================================================================

-- 3. UserAssets (Catálogo de Assets Subidos - Maestra)
CREATE TABLE "UserAssets" (
    "AssetId" SERIAL PRIMARY KEY,
    "AssetName" VARCHAR(100) NOT NULL,
    "AssetType" VARCHAR(50) NOT NULL, -- Ej: 'Model', 'Texture'
    "StoragePath" VARCHAR(512) NOT NULL, -- Ruta al archivo BLOB
    "PolyCount" INTEGER NOT NULL,
    "FileSizeMB" REAL NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Pending', -- Ej: 'Approved', 'Banned'
    "ThumbnailPath" VARCHAR(512),  -- Ruta a la imagen de previsualización
    "ContentType" VARCHAR(100),    -- Tipo MIME (ej: 'model/gltf-binary', 'image/png')
    "FileExtension" VARCHAR(10);   -- Extensión (ej: .glb, .png)
    
    -- NUEVAS COLUMNAS PARA GESTIÓN PÚBLICA:
    "IsPublic" BOOLEAN NOT NULL DEFAULT FALSE, -- Si el asset puede ser usado por otros
    "IPOwnerId" INTEGER NOT NULL, -- Dueño de la propiedad intelectual
    
    CONSTRAINT "FK_UserAssets_Users_IPOwnerId" FOREIGN KEY ("IPOwnerId")
        REFERENCES "Users" ("UserId") ON DELETE RESTRICT
);


-- =================================================================
-- 3. Tablas de Inventario y Avatares (Uso por Jugador)
-- =================================================================

-- 4. PlayerAssetInventory (Inventario de Copias/Referencias por Jugador)
CREATE TABLE "PlayerAssetInventory" (
    "InventoryId" SERIAL PRIMARY KEY,
    "UserId" INTEGER NOT NULL, -- El jugador que tiene esta copia/referencia
    "MasterAssetId" INTEGER NOT NULL, -- El asset original en el catálogo (UserAssets)
    "CustomProperties" JSONB, -- Propiedades específicas de esta copia (color, escala, etc.)

    CONSTRAINT "FK_PAI_Users_UserId" FOREIGN KEY ("UserId")
        REFERENCES "Users" ("UserId") ON DELETE CASCADE,
        
    CONSTRAINT "FK_PAI_UserAssets_MasterAssetId" FOREIGN KEY ("MasterAssetId")
        REFERENCES "UserAssets" ("AssetId") ON DELETE RESTRICT -- Evita borrar el original si alguien lo está usando
);

-- 5. AvatarConfigs (Guardados/Looks del Avatar)
CREATE TABLE "AvatarConfigs" (
    "ConfigId" SERIAL PRIMARY KEY,
    "UserId" INTEGER NOT NULL,
    "ConfigName" VARCHAR(50),

    CONSTRAINT "FK_AvatarConfigs_Users_UserId" FOREIGN KEY ("UserId")
        REFERENCES "Users" ("UserId") ON DELETE CASCADE
);

-- 6. AvatarAssetMapping (Tabla de Relación Muchos a Muchos: Configs -> Assets en Inventario)
CREATE TABLE "AvatarAssetMapping" (
    "MappingId" SERIAL PRIMARY KEY,
    "ConfigId" INTEGER NOT NULL, -- FK a la configuración del avatar
    "InventoryId" INTEGER NOT NULL, -- FK al asset específico en el INVENTARIO del jugador (PlayerAssetInventory)
    "EquipmentSlot" VARCHAR(50) NOT NULL, -- Ej: 'Head', 'Torso', 'Accessory1'

    -- Definición de Claves Foráneas
    CONSTRAINT "FK_AAM_AvatarConfigs_ConfigId" FOREIGN KEY ("ConfigId")
        REFERENCES "AvatarConfigs" ("ConfigId") ON DELETE CASCADE,
    
    CONSTRAINT "FK_AAM_PAI_InventoryId" FOREIGN KEY ("InventoryId")
        REFERENCES "PlayerAssetInventory" ("InventoryId") ON DELETE RESTRICT -- No desequipar si la copia del inventario es eliminada
);


-- =================================================================
-- 4. Tablas de Mundos y Servidores
-- =================================================================

-- 7. WorldConfigs (Plantillas de Mundos Replicables)
CREATE TABLE "WorldConfigs" (
    "WorldId" SERIAL PRIMARY KEY,
    "WorldName" VARCHAR(50) NOT NULL,
    "MapSceneName" VARCHAR(100) NOT NULL,
    "ParamGravity" REAL NOT NULL DEFAULT 9.8,
    "ParamSizeX" REAL NOT NULL DEFAULT 1000.0,
    "ParamSizeY" REAL NOT NULL DEFAULT 1000.0,
    "ParamPhysicsMode" VARCHAR(20) NOT NULL DEFAULT 'Standard',
    "CreationDate" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. WorldInstances (Instancias Activas de Servidores)
CREATE TABLE "WorldInstances" (
    "InstanceId" SERIAL PRIMARY KEY,
    "WorldId" INTEGER NOT NULL, -- FK a la configuración base
    "IpAddress" VARCHAR(50) NOT NULL,
    "Port" INTEGER NOT NULL,
    "CurrentPlayers" INTEGER NOT NULL DEFAULT 0,
    "StartTime" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT "FK_WorldInstances_WorldConfigs_WorldId" FOREIGN KEY ("WorldId")
        REFERENCES "WorldConfigs" ("WorldId") ON DELETE CASCADE
);

CREATE TABLE "UserFriendship" (
    "Id" SERIAL PRIMARY KEY,

    -- Usuario que INICIA la solicitud (Requester)
    "RequesterId" INTEGER NOT NULL, 
    
    -- Usuario que RECIBE la solicitud (Target)
    "TargetId" INTEGER NOT NULL, 
    
    -- Estado: 'Pending', 'Accepted', 'Blocked'
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Pending', 
    
    "CreatedDate" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "AcceptedDate" TIMESTAMP WITHOUT TIME ZONE,
    
    -- Restricciones de Clave Foránea
    -- Al borrar un usuario, se restringe la eliminación de la solicitud (debería eliminarse primero la solicitud/amistad)
    CONSTRAINT "FK_UF_RequesterId" FOREIGN KEY ("RequesterId")
        REFERENCES "Users" ("UserId") ON DELETE RESTRICT,
        
    CONSTRAINT "FK_UF_TargetId" FOREIGN KEY ("TargetId")
        REFERENCES "Users" ("UserId") ON DELETE RESTRICT,
        
    -- Restricción de Unicidad para evitar solicitudes duplicadas.
    -- Asegura que solo exista una relación entre dos usuarios, sin importar quién la inició (RequesterId, TargetId).
    -- Este tipo de chequeo es más fácil de manejar con lógica de aplicación, pero un índice compuesto ayuda.
    CONSTRAINT "UQ_Friendship_Pair" UNIQUE ("RequesterId", "TargetId"),
    
    -- Evitar que un usuario se envíe una solicitud a sí mismo
    CONSTRAINT "CHK_Different_Users" CHECK ("RequesterId" <> "TargetId")
);

CREATE TABLE "CurrencyTypes" (
    "CurrencyId" SERIAL PRIMARY KEY,
    "Name" VARCHAR(50) NOT NULL,       -- Nombre legible (Ej: 'Gold', 'Gems')
    "Abbreviation" VARCHAR(10) NOT NULL, -- Abreviatura (Ej: 'G', 'GM')
    "IsPremium" BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO "CurrencyTypes" ("Name", "Abbreviation", "IsPremium") VALUES
('Gold', 'G', FALSE),    -- Moneda estándar (farmeable)
('Gems', 'GM', TRUE);     -- Moneda premium (comprable con dinero real)

CREATE TABLE "UserBalances" (
    "BalanceId" SERIAL PRIMARY KEY,
    "UserId" INTEGER NOT NULL,
    "CurrencyId" INTEGER NOT NULL,
    
    -- Tipo DECIMAL con alta precisión para manejar dinero
    "Amount" DECIMAL(18, 2) NOT NULL DEFAULT 0.00, 

    -- Restricciones de Clave Foránea
    CONSTRAINT "FK_UB_UserId" FOREIGN KEY ("UserId")
        REFERENCES "Users" ("UserId") ON DELETE CASCADE, -- Si el usuario es borrado, se borra su saldo
        
    CONSTRAINT "FK_UB_CurrencyId" FOREIGN KEY ("CurrencyId")
        REFERENCES "CurrencyTypes" ("CurrencyId") ON DELETE RESTRICT, -- No se puede borrar un tipo de moneda si hay saldos

    -- Restricción de Unicidad
    -- Asegura que un usuario solo tenga UNA fila por tipo de moneda.
    CONSTRAINT "UQ_User_Currency_Pair" UNIQUE ("UserId", "CurrencyId")
);

ALTER TABLE IF EXISTS public."SubscriptionPlans"
    ADD COLUMN "PriceMonthly" money DEFAULT 0.0;
