from apps.admin.utils.csv_helpers import generate_csv_rows, import_users_from_csv
from rest_framework.generics import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.admin.serializers.user_serializers import BanUserSerializer, ImportUserFromCSVSerializer
from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView
from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.utils.dateparse import parse_date
from django.http import StreamingHttpResponse
from django.utils import timezone

CSV_FIELDS = [
    "id", "username", "email",
    "first_name", "last_name",
    "is_active", "is_staff", "date_joined",
]

class BanUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = BanUserSerializer

    @extend_schema(
        summary="Ban User",
        description="Ban a user account by setting its is_active status to False. Only Admins can perform this action. You cannot ban yourself, another Admin, or an already banned user.",
        request=None,
        responses={
            200: BanUserSerializer,
            400: OpenApiResponse(description="Bad Request - Cannot ban yourself, another admin, or an already banned user"),
            401: OpenApiResponse(description="Unauthorized - Token is missing or invalid"),
            403: OpenApiResponse(description="Forbidden - User is not an admin"),
            404: OpenApiResponse(description="Not Found - User does not exist"),
        }
    )
    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk)
        serializer = self.serializer_class(target, context={'request': request})
        serializer.ban()
        return Response(serializer.data, status=status.HTTP_200_OK)

class UnbanUserView(APIView): 
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = BanUserSerializer

    @extend_schema(
        summary="Unban User",
        description="Unban a user account by setting its is_active status to True. Only Admins can perform this action. You cannot unban an already active user.",
        request=None,
        responses={
            200: BanUserSerializer,
            400: OpenApiResponse(description="Bad Request - Cannot unban an already active user"),
            401: OpenApiResponse(description="Unauthorized - Token is missing or invalid"),
            403: OpenApiResponse(description="Forbidden - User is not an admin"),
            404: OpenApiResponse(description="Not Found - User does not exist"),
        }
    )
    def post(self, request, pk): 
        target = get_object_or_404(User, pk=pk)
        serializer = self.serializer_class(target, context={'request': request})
        serializer.unban()
        return Response(serializer.data, status=status.HTTP_200_OK)

class ExportUsersToCSVView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request): 
        queryset = User.objects.all().order_by("id")
        is_active = request.query_params.get("is_active")
        
        if is_active:
            if is_active.lower() == "true":
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() == "false":
                queryset = queryset.filter(is_active=False)
            else:
                return Response({"is_active": ["Value must be 'true' or 'false'."]}, status=status.HTTP_400_BAD_REQUEST) 
            
        
        is_staff = request.query_params.get("is_staff")
        if is_staff: 
            if is_staff.lower() == "true":
                queryset = queryset.filter(is_staff=True)
            elif is_staff.lower() == "false":
                queryset = queryset.filter(is_staff=False)
            else:
                return Response({"is_staff": ["Value must be 'true' or 'false'."]}, status=status.HTTP_400_BAD_REQUEST)
            
        from_date = request.query_params.get("from")
        if from_date:
            try:
                from_date = parse_date(from_date)
                if not from_date:
                    raise ValueError()
                queryset = queryset.filter(date_joined__date__gte=from_date)
            except ValueError:
                return Response({"from": ["Invalid date format. Use YYYY-MM-DD."]}, status=status.HTTP_400_BAD_REQUEST)
                    
        to_date = request.query_params.get("to")
        if to_date:
            try:
                to_date = parse_date(to_date)
                if not to_date:
                    raise ValueError()
                queryset = queryset.filter(date_joined__date__lte=to_date)
            except ValueError:
                return Response({"to": ["Invalid date format. Use YYYY-MM-DD."]}, status=status.HTTP_400_BAD_REQUEST)
        
        filename = f"users_{timezone.now().strftime('%Y-%m-%d-%H-%M-%S')}.csv"        
        response = StreamingHttpResponse(
            streaming_content=generate_csv_rows(queryset, CSV_FIELDS),
            content_type="text/csv; charset=utf-8-sig",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

class ImportUsersFromCSVView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = ImportUserFromCSVSerializer

    @extend_schema(
        summary="Import Users from CSV",
        description="Import multiple users from a CSV file. Expected columns: username, email, password, first_name, last_name.",
        request=ImportUserFromCSVSerializer,
        responses={
            200: OpenApiResponse(description="Import stats (total_rows, imported, skipped, errors)"),
            400: OpenApiResponse(description="Bad Request - Invalid or oversized file"),
            401: OpenApiResponse(description="Unauthorized - Token is missing or invalid"),
            403: OpenApiResponse(description="Forbidden - User is not an admin"),
        }
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            try:
                result = import_users_from_csv(serializer.validated_data['file'])
                return Response(result, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"file": [f"Error processing CSV: {str(e)}"]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)