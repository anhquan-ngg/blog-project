import csv
from apps.admin.utils.csv_helpers import generate_csv_rows, import_users_from_csv
from rest_framework.generics import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.admin.serializers.user_serializers import BanUserSerializer, ImportUserFromCSVSerializer
from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView
from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers
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
            400: OpenApiResponse(
                description="Bad Request - Cannot ban yourself, another admin, or an already banned user",
                response=inline_serializer(
                    name="BanUserErrorResponse",
                    fields={
                        "non_field_errors": serializers.ListField(child=serializers.CharField())
                    }
                ),
                examples=[
                    OpenApiExample(
                        name="Cannot ban yourself",
                        value={"non_field_errors": ["You cannot ban yourself."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                description="Unauthorized - Token is missing or invalid",
                response=inline_serializer(
                    name="BanUserUnauthorizedError",
                    fields={
                        "detail": serializers.CharField()
                    }
                ),
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - User is not an admin",
                response=inline_serializer(
                    name="BanUserForbiddenError",
                    fields={
                        "detail": serializers.CharField()
                    }
                ),
                examples=[
                    OpenApiExample(
                        name="Forbidden",
                        value={"detail": "You do not have permission to perform this action."}
                    )
                ]
            ),
            404: OpenApiResponse(
                description="Not Found - User does not exist",
                response=inline_serializer(
                    name="BanUserNotFoundError",
                    fields={
                        "detail": serializers.CharField()
                    }
                ),
                examples=[
                    OpenApiExample(
                        name="Not Found",
                        value={"detail": "Not found."}
                    )
                ]
            ),
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
            400: OpenApiResponse(
                description="Bad Request - Cannot unban an already active user",
                response=inline_serializer(
                    name="UnbanUserErrorResponse",
                    fields={
                        "non_field_errors": serializers.ListField(child=serializers.CharField())
                    }
                ),
                examples=[
                    OpenApiExample(
                        name="Cannot unban active user",
                        value={"non_field_errors": ["User is already active."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                description="Unauthorized - Token is missing or invalid",
                response=inline_serializer(
                    name="UnbanUserUnauthorizedError",
                    fields={
                        "detail": serializers.CharField()
                    }
                ),
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - User is not an admin",
                response=inline_serializer(
                    name="UnbanUserForbiddenError",
                    fields={
                        "detail": serializers.CharField()
                    }
                ),
                examples=[
                    OpenApiExample(
                        name="Forbidden",
                        value={"detail": "You do not have permission to perform this action."}
                    )
                ]
            ),
            404: OpenApiResponse(
                description="Not Found - User does not exist",
                response=inline_serializer(
                    name="UnbanUserNotFoundError",
                    fields={
                        "detail": serializers.CharField()
                    }
                ),
                examples=[
                    OpenApiExample(
                        name="Not Found",
                        value={"detail": "Not found."}
                    )
                ]
            ),
        }
    )
    def post(self, request, pk): 
        target = get_object_or_404(User, pk=pk)
        serializer = self.serializer_class(target, context={'request': request})
        serializer.unban()
        return Response(serializer.data, status=status.HTTP_200_OK)

class ExportUsersToCSVView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    @extend_schema(
        summary="Export Users to CSV",
        description="Export users to a CSV file. Filter by is_active, is_staff, from_date, and to_date.",
        responses={
            200: OpenApiResponse(description="CSV file containing users data"),
            400: OpenApiResponse(
                description="Bad Request - Invalid date format or boolean value",
                response=inline_serializer(
                    name="ExportUsersToCSVError",
                    fields={
                        "is_active": serializers.ListField(child=serializers.CharField(), required=False),
                        "is_staff": serializers.ListField(child=serializers.CharField(), required=False),
                        "from": serializers.ListField(child=serializers.CharField(), required=False),
                        "to": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                examples=[
                    OpenApiExample(
                        "Invalid from date",
                        value={"from": ["Invalid date format. Use YYYY-MM-DD."]}
                    ),
                    OpenApiExample(
                        "Invalid is_active boolean",
                        value={"is_active": ["Value must be 'true' or 'false'."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                description="Unauthorized - Token is missing or invalid",
                response = inline_serializer(
                    name="ExportUsersToCSVUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                examples=[
                    OpenApiExample(
                        "Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - User is not an admin",
                response = inline_serializer(
                    name="ExportUsersToCSVForbiddenError",
                    fields={"detail": serializers.CharField()}
                ),
                examples=[
                    OpenApiExample(
                        "Forbidden",
                        value={"detail": "You do not have permission to perform this action."}
                    )
                ]
            ),
        }
    )
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
            400: OpenApiResponse(
                description="Bad Request - Invalid or oversized file",
                response=inline_serializer(
                    name="ImportUsersFromCSVError",
                    fields={
                        "file": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                examples=[
                    OpenApiExample(
                        "Error processing CSV",
                        value={"file": ["Error processing CSV: <error details>"]}
                    ),
                    OpenApiExample(
                        "Invalid file error",
                        value={"file": ["The submitted file is empty."]}
                    )
                ]
            ),
            
            401: OpenApiResponse(
                description="Unauthorized - Token is missing or invalid",
                response = inline_serializer(
                    name="ImportUsersToCSVUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                examples=[
                    OpenApiExample(
                        "Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - User is not an admin",
                response = inline_serializer(
                    name="ImportUsersToCSVForbiddenError",
                    fields={"detail": serializers.CharField()}
                ),
                examples=[
                    OpenApiExample(
                        "Forbidden",
                        value={"detail": "You do not have permission to perform this action."}
                    )
                ]
            ),
        }
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            try:
                result = import_users_from_csv(serializer.validated_data['file'])
                return Response(result, status=status.HTTP_200_OK)
            except (csv.Error, UnicodeDecodeError, ValueError) as e:
                return Response({"file": [f"Error processing CSV: {str(e)}"]}, status=status.HTTP_400_BAD_REQUEST)
            except BaseException:
                raise
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)