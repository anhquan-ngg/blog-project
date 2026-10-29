from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def api_info(request):
    return JsonResponse({
        'name': 'Blog API',
        'version': '1.0.0',
        'docs': '/api/docs/',
        'schema': '/api/schema/',
        'client': 'React Native (Expo)',
    })
