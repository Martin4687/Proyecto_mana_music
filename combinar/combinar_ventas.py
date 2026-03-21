#!/usr/bin/env python3
"""
Script para combinar los archivos JSX parciales en un componente completo de Ventas
Uso: python combinar_ventas.py
"""

import os

def combinar_ventas_jsx():
    """Combina los archivos parciales de Ventas en un solo archivo completo"""
    
    print("🔧 Combinando archivos JSX de Ventas...")
    
    # Rutas de los archivos
    archivo_base = "Ventas.jsx"
    archivo_modales = "Ventas_modales.jsx"
    archivo_salida = "Ventas_COMPLETO.jsx"
    
    # Verificar que existan los archivos
    if not os.path.exists(archivo_base):
        print(f"❌ Error: No se encuentra {archivo_base}")
        print(f"   Ubicación actual: {os.getcwd()}")
        return False
    
    if not os.path.exists(archivo_modales):
        print(f"❌ Error: No se encuentra {archivo_modales}")
        return False
    
    try:
        # Leer el archivo base
        with open(archivo_base, 'r', encoding='utf-8') as f:
            contenido_base = f.read()
        
        # Leer los modales
        with open(archivo_modales, 'r', encoding='utf-8') as f:
            contenido_modales = f.read()
        
        # Eliminar el comentario de "Continuará" si existe
        contenido_base = contenido_base.replace(
            "{/* Continuará en el siguiente bloque... */}",
            ""
        ).replace(
            "{/* MODALES - Por completar en siguiente archivo debido al tamaño... */}",
            ""
        )
        
        # Encontrar la posición donde insertar los modales
        # Buscar el cierre del return antes del último </div>
        # Los modales deben ir ANTES del cierre de ventas-container
        
        # Buscar el último </div> que cierra ventas-container
        # y el export default Ventas
        
        # Dividir el contenido base
        partes = contenido_base.rsplit('</div>', 1)
        
        if len(partes) != 2:
            print("⚠️  Advertencia: No se pudo encontrar el punto de inserción exacto")
            print("   Se agregará al final antes del export")
            # Buscar export default
            partes = contenido_base.rsplit('export default Ventas;', 1)
            if len(partes) == 2:
                contenido_completo = partes[0] + '\n' + contenido_modales + '\n    </div>\n  );\n}\n\nexport default Ventas;' + partes[1]
            else:
                contenido_completo = contenido_base + '\n' + contenido_modales
        else:
            # Insertar modales antes del cierre final
            contenido_completo = partes[0] + '\n\n      ' + contenido_modales + '\n    </div>' + partes[1]
        
        # Escribir el archivo combinado
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            f.write(contenido_completo)
        
        # Contar líneas
        num_lineas = len(contenido_completo.split('\n'))
        
        print(f"✅ Archivo combinado creado exitosamente!")
        print(f"📄 Archivo: {archivo_salida}")
        print(f"📊 Total de líneas: {num_lineas}")
        print(f"\n📋 Próximos pasos:")
        print(f"   1. Copia {archivo_salida} a frontend/src/Ventas.jsx")
        print(f"   2. Verifica que no haya errores de sintaxis")
        print(f"   3. Prueba el componente en el navegador")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al combinar archivos: {str(e)}")
        return False


def crear_jsx_completo_desde_cero():
    """Crea el archivo JSX completo si no existen los parciales"""
    
    print("📝 Creando Ventas.jsx completo desde cero...")
    
    # Aquí iría el código completo si fuera necesario
    print("⚠️  Esta función requiere los archivos parciales")
    print("   Por favor, asegúrate de tener:")
    print("   - Ventas.jsx (archivo base)")
    print("   - Ventas_modales.jsx (código de modales)")
    

if __name__ == "__main__":
    print("=" * 60)
    print("  COMBINADOR DE ARCHIVOS JSX - MÓDULO DE VENTAS")
    print("=" * 60)
    print()
    
    # Cambiar al directorio correcto si es necesario
    # os.chdir("ruta/a/tus/archivos")
    
    exito = combinar_ventas_jsx()
    
    if exito:
        print("\n✨ Proceso completado con éxito!")
    else:
        print("\n❌ Hubo errores en el proceso")
        print("\n💡 Asegúrate de que los archivos estén en el mismo directorio:")
        print("   - Ventas.jsx")
        print("   - Ventas_modales.jsx")
    
    print("\n" + "=" * 60)