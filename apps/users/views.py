from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, LoginSerializer
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated

class RegisterView(APIView):
    permission_classes = []
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = []
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
        }, status=status.HTTP_200_OK)

class LogoutView(APIView): 
    permission_classes = [IsAuthenticated]

    def post(self, request): 
        request.user.auth_token.delete()
        return Response({}, status=status.HTTP_204_NO_CONTENT)