"""
Script alternativo para crear el usuario admin directamente desde Django
Ejecutar: python manage.py shell < crear_admin.py
O copiar y pegar en: python manage.py shell
"""

from django.contrib.auth.hashers import make_password
from api.models import Rol, Persona, Usuario
from datetime import date

print("\n" + "="*60)
print("🔐 CREANDO USUARIO ADMINISTRADOR")
print("="*60 + "\n")

# ==================== CREAR/VERIFICAR ROLES ====================
print("📋 Verificando roles...")

roles_data = [
    {'id_rol': 1, 'nombre_rol': 'Administrador'},
    {'id_rol': 2, 'nombre_rol': 'Vendedor'},
    {'id_rol': 3, 'nombre_rol': 'Cliente'},
]

for rol_data in roles_data:
    rol, created = Rol.objects.get_or_create(
        id_rol=rol_data['id_rol'],
        defaults={'nombre_rol': rol_data['nombre_rol']}
    )
    if created:
        print(f"  ✓ Rol creado: {rol.nombre_rol} (ID: {rol.id_rol})")
    else:
        print(f"  • Rol existente: {rol.nombre_rol} (ID: {rol.id_rol})")

# ==================== CREAR PERSONA ADMIN ====================
print("\n👤 Creando persona administrador...")

rol_admin = Rol.objects.get(id_rol=1)

persona, created = Persona.objects.get_or_create(
    ci='00000000',
    defaults={
        'id_rol': rol_admin,
        'nombres': 'admin',
        'apellido_paterno': 'admin_ap',
        'apellido_materno': 'admin_am',
        'telefono': '12345678'
    }
)

if created:
    print(f"  ✓ Persona creada: {persona} (ID: {persona.id_persona})")
else:
    print(f"  • Persona existente: {persona} (ID: {persona.id_persona})")

# ==================== CREAR USUARIO ADMIN ====================
print("\n🔑 Creando usuario administrador...")

# Hashear la contraseña
password_plana = 'Admin123!'
password_hash = make_password(password_plana)

usuario, created = Usuario.objects.get_or_create(
    email='admin@manamusic.com',
    defaults={
        'id_persona': persona,
        'password_hash': password_hash,
        'fecha_registro': date(2026, 2, 11),
        'activo': True
    }
)

if created:
    print(f"  ✓ Usuario creado: {usuario.email}")
    print(f"  ✓ ID Usuario: {usuario.id_usuario}")
    print(f"  ✓ Contraseña: {password_plana}")
    print(f"  ✓ Hash: {password_hash[:50]}...")
else:
    # Si ya existe, actualizar la contraseña
    print(f"  • Usuario existente: {usuario.email}")
    print(f"  • Actualizando contraseña...")
    usuario.password_hash = password_hash
    usuario.save()
    print(f"  ✓ Contraseña actualizada")

# ==================== VERIFICACIÓN ====================
print("\n" + "="*60)
print("✅ VERIFICACIÓN FINAL")
print("="*60 + "\n")

print("📊 Roles en el sistema:")
for rol in Rol.objects.all().order_by('id_rol'):
    print(f"  {rol.id_rol}. {rol.nombre_rol}")

print(f"\n👤 Persona admin:")
print(f"  ID: {persona.id_persona}")
print(f"  Nombre: {persona.nombres} {persona.apellido_paterno} {persona.apellido_materno}")
print(f"  CI: {persona.ci}")
print(f"  Rol: {persona.id_rol.nombre_rol}")

print(f"\n🔑 Usuario admin:")
print(f"  ID: {usuario.id_usuario}")
print(f"  Email: {usuario.email}")
print(f"  Activo: {'Sí' if usuario.activo else 'No'}")
print(f"  Fecha registro: {usuario.fecha_registro}")
print(f"  Rol: {usuario.id_persona.id_rol.nombre_rol}")

print("\n" + "="*60)
print("🎉 ¡LISTO! Puedes iniciar sesión con:")
print(f"   Email: {usuario.email}")
print(f"   Password: {password_plana}")
print("="*60 + "\n")