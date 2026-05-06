# api/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework import authentication, exceptions
from rest_framework.permissions import BasePermission
from .models import Usuario


class UsuarioJWTAuthentication(JWTAuthentication):
    """
    Autenticador JWT personalizado que usa el modelo Usuario
    en lugar del auth.User de Django.
    """

    def get_user(self, validated_token):
        try:
            user_id = validated_token.get('user_id')
            if user_id is None:
                raise InvalidToken('Token no contiene user_id')

            usuario = Usuario.objects.select_related(
                'id_persona', 'id_persona__id_rol'
            ).get(id_usuario=user_id)

            if not usuario.activo:
                raise exceptions.AuthenticationFailed('Usuario inactivo')

            return usuario

        except Usuario.DoesNotExist:
            raise exceptions.AuthenticationFailed('Usuario no encontrado')
        
class IsUsuarioAuthenticated(BasePermission):
    """
    Permiso personalizado compatible con el modelo Usuario.
    Reemplaza IsAuthenticated para nuestro modelo custom.
    """
    def has_permission(self, request, view):
        return (
            request.user is not None
            and isinstance(request.user, Usuario)
            and request.user.activo
        )