// tools/add-note.js
import fs from "fs"
import path from "path"
import readline from "readline"

const notesFile = path.resolve("./_notes_.txt")

// Obtener fecha y hora
const now = new Date()
const timestamp = now.toLocaleString("es-MX", { hour12: false })

// Crear línea de encabezado
const header = `\n=== [${timestamp}] ===\n`

// Crear interfaz para escribir una nota en consola
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

rl.question("Escribe tu nota: ", (note) => {
    const entry = `${header}- ${note}\n`
    fs.appendFileSync(notesFile, entry)
    console.log("✅ Nota guardada en _notes_.txt")
    rl.close()
})
