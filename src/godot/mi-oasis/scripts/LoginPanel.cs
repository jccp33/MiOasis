using Godot;
using System;

public partial class LoginPanel : PanelContainer
{
	// --- PROPIEDADES EXPORTADAS (AJUSTABLES EN EL INSPECTOR) ---
	[Export] public float GridSize = 20.0f; // Tamaño de cada celda de la cuadrícula
	[Export] public Color LineColor = new Color(0.1f, 0.1f, 0.1f, 0.3f); // Color base de las líneas (oscuro y semitransparente)
	[Export] public float FollowStrength = 0.05f; // Fuerza con la que la cuadrícula se desplaza con el mouse (ilusión de movimiento)
	[Export] public int HighlightRadius = 5; // Radio de celdas afectadas por el mouse (Aumentado para mayor efecto)
	[Export] public float MaxLineWidth = 3.5f; // Grosor máximo de las líneas resaltadas
	[Export] public float RainbowSpeed = 0.5f; // Velocidad del ciclo de color del arcoíris

	// --- VARIABLES INTERNAS ---
	private float _time = 0.0f; 
	private Vector2 _mouseOffset = Vector2.Zero;
	private Vector2 _mousePos = Vector2.Zero;
	
	// --- LIFECYCLE GODOT ---
	
	public override void _Ready()
	{
		// Permite que los eventos de mouse pasen al nodo de abajo, pero este nodo recibe la información
		MouseFilter = MouseFilterEnum.Pass; 
		// Activa el proceso de entrada y el proceso de frame (_Process)
		SetProcessInput(true);
		SetProcess(true);
	}

	public override void _Process(double delta)
	{
		// 1. Actualiza el tiempo para el efecto Arcoíris.
		_time += (float)delta * RainbowSpeed; 
		// 2. Fuerza el redibujo en cada frame para el cambio de color dinámico.
		QueueRedraw();
	}
	
	public override void _Input(InputEvent @event)
	{
		// 1. Captura el movimiento del mouse.
		if (@event is InputEventMouseMotion motion)
		{
			_mousePos = motion.Position;
			// Aplica suavidad al desplazamiento de la cuadrícula
			_mouseOffset = _mouseOffset.Lerp(motion.Position * FollowStrength, 0.2f);
			// QueueRedraw ya está en _Process, pero es buena práctica tenerlo aquí también si _Process fuera a estar desactivado.
		}
	}
	
	// --- DIBUJO 2D ---

	public override void _Draw()
	{
		Vector2 size = Size;
		
		// 1. CÁLCULO DEL DESPLAZAMIENTO Y CUADRÍCULA BASE
		
		// Calcula el desplazamiento que hace que la cuadrícula se mueva continuamente
		float offsetX = Mathf.PosMod(_mouseOffset.X, GridSize);
		float offsetY = Mathf.PosMod(_mouseOffset.Y, GridSize);
		
		// Dibujar la cuadrícula base (líneas estáticas)
		for (float x = -GridSize; x < size.X + GridSize; x += GridSize)
		{
			DrawLine(new Vector2(x - offsetX, 0), new Vector2(x - offsetX, size.Y), LineColor);
		}
		for (float y = -GridSize; y < size.Y + GridSize; y += GridSize)
		{
			DrawLine(new Vector2(0, y - offsetY), new Vector2(size.X, y - offsetY), LineColor);
		}
		
		// 2. CÁLCULO DE LA CELDA ACTIVA
		
		// Coordenadas enteras de la celda donde está el mouse
		int centerX = Mathf.FloorToInt((_mousePos.X + offsetX) / GridSize);
		int centerY = Mathf.FloorToInt((_mousePos.Y + offsetY) / GridSize);
		
		// 3. EFECTO DE RESALTADO Y ARCOÍRIS
		
		// Tono base del arcoíris, que varía con el tiempo
		float baseHue = Mathf.PosMod(_time, 1.0f);
		
		float maxDist = HighlightRadius + 0.75f; // Radio máximo para normalización
		
		for (int dx = -HighlightRadius; dx <= HighlightRadius; dx++)
		{
			for (int dy = -HighlightRadius; dy <= HighlightRadius; dy++)
			{
				int cellX = centerX + dx;
				int cellY = centerY + dy;
				
				// Calcula la distancia euclidiana al centro (0,0) del loop
				float dist = new Vector2(dx, dy).Length();
				
				// Calcula la intensidad (1.0f cerca del mouse, 0.0f lejos)
				float intensity = Mathf.Clamp(1.0f - dist / maxDist, 0f, 1.0f);
				
				if (intensity < 0.05f) continue; // Optimización: no dibujar celdas casi invisibles
				
				// --- Generación del Color Arcoíris ---
				
				// Aplica un desplazamiento al Tono basado en la posición de la celda para el efecto de ola
				float cellHue = Mathf.PosMod(baseHue + (cellX * 0.05f) + (cellY * 0.03f), 1.0f);
				
				// Genera el color brillante del arcoíris (Saturación y Valor altos)
				Color dynamicColor = Color.FromHsv(cellHue, 0.8f, 1.0f); 
				
				// --- Aplicación del Resalte ---
				
				// Efecto de "hinchado" (expansión visual)
				float inflate = intensity * (GridSize * 0.15f); // Aumentado ligeramente para mejor visibilidad
				float lineWidth = 1.0f + (MaxLineWidth - 1.0f) * intensity; // Grosor de línea
				
				// Coordenadas base de la celda
				Vector2 topLeft = new Vector2(cellX * GridSize - offsetX, cellY * GridSize - offsetY);
				Vector2 topRight = topLeft + new Vector2(GridSize, 0);
				Vector2 bottomLeft = topLeft + new Vector2(0, GridSize);
				Vector2 bottomRight = topLeft + new Vector2(GridSize, GridSize);
				
				// Aplicar el "inflado" a las esquinas
				topLeft -= new Vector2(inflate, inflate);
				bottomRight += new Vector2(inflate, inflate);
				topRight.X += inflate;
				topRight.Y -= inflate;
				bottomLeft.X -= inflate;
				bottomLeft.Y += inflate;
				
				// Mezcla el color dinámico con el color base usando la intensidad
				Color cellColor = LineColor.Lerp(dynamicColor, intensity);
				// Asegura una opacidad mínima en las celdas resaltadas
				cellColor.A = LineColor.A + (1.0f - LineColor.A) * intensity; 
				
				// Dibuja los bordes resaltados
				DrawLine(topLeft, topRight, cellColor, lineWidth);
				DrawLine(topLeft, bottomLeft, cellColor, lineWidth);
				DrawLine(topRight, bottomRight, cellColor, lineWidth);
				DrawLine(bottomLeft, bottomRight, cellColor, lineWidth);
			}
		}
	}
	
	public void _on_button_login_pressed()
	{
		GD.Print("Ingresar ...");
	}
	
	public void _on_button_register_pressed()
	{
		GetTree().ChangeSceneToFile("res://register.tscn");
	}
	
	public void _on_button_logout_pressed()
	{
		GetTree().Quit();
	}
}
