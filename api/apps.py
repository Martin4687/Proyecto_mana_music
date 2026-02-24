from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        """
        Este método se ejecuta cuando Django inicia.
        Aquí importamos los signals para que se registren.
        """
        import api.signals  # Importar signals cuando la app esté lista
