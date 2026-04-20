from django.utils import timezone
from django.db.models import Prefetch
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from apps.posts.models import Post, PostImages
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework import status
from apps.admin.serializers.post_serializers import ExportPostToCSVSerializer, ImportPostFromCSVSerializer
from django.http import StreamingHttpResponse
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers
from apps.admin.utils.csv_helpers import generate_csv_rows, import_posts_from_csv

CSV_FIELDS = [
    "id", "title", "author_username",
    "category_name", "tags", "content", "likes_count", "bookmarks_count", "created_at"
]


class ExportPostsToCSVView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    @extend_schema(
        summary="Export Posts to CSV",
        description="Export all (or filtered) posts to a CSV file for download. Only Admin (`is_staff=True`) can perform this. Excludes soft deleted (`is_deleted=True`) posts. Returns direct file download via StreamingHttpResponse.",
        parameters=[
            OpenApiParameter(name='category', description='Filter by Category ID', required=False, type=int),
            OpenApiParameter(name='from', description='From date. Format: YYYY-MM-DD', required=False, type=str),
            OpenApiParameter(name='to', description='To date. Format: YYYY-MM-DD', required=False, type=str),
        ],
        responses={
            (200, 'text/csv'): OpenApiResponse(
                response=OpenApiTypes.BINARY,
                description="CSV file containing posts data (id, title, author_username, category_name, tags, content, likes_count, bookmarks_count, created_at). Encoded in utf-8-sig.",
                examples=[
                    OpenApiExample(
                        name="With Data",
                        description="CSV output with data",
                        value='id,title,author_username,category_name,tags,content,likes_count,bookmarks_count,created_at\n1,Getting Started with DRF,johndoe,Backend,"drf, tutorial","[{""type"":""paragraph"",""data"":{""text"":""Hello""}}]",47,12,2024-01-14T10:00:00Z\n2,Advanced Serializers,johndoe,Backend,"drf, advanced","[{""type"":""image"",""data"":{""url"":""/media/files/img.jpg""}}]",23,9,2024-01-10T08:00:00Z'
                    ),
                    OpenApiExample(
                        name="Empty Result",
                        description="Only header, no data rows",
                        value='id,title,author_username,category_name,tags,content,likes_count,bookmarks_count,created_at\n'
                    )
                ]
            ),
            400: OpenApiResponse(
                description="Bad Request - Invalid date format",
                response=inline_serializer(
                    name="ExportPostsToCSVError",
                    fields={
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
                        "Invalid to date",
                        value={"to": ["Invalid date format. Use YYYY-MM-DD."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                description="Unauthorized - Token is missing or invalid",
                response=inline_serializer(
                    name="ExportPostsToCSVUnauthorizedError",
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
                response=inline_serializer(
                    name="ExportPostsToCSVForbiddenError",
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
        queryset = Post.objects.filter(is_deleted=False).select_related("author", "category").prefetch_related(
            "tags",
            Prefetch("post_images", queryset=PostImages.objects.select_related("file")),
        ).order_by("id")
        
        category = request.query_params.get("category")
        if category :
            queryset = queryset.filter(category__id=category)
        
        from_date = request.query_params.get("from")
        if from_date:
            try:
                from_date = parse_date(from_date)
                if not from_date:
                    raise ValueError()
                queryset = queryset.filter(created_at__date__gte=from_date)
            except ValueError:
                return Response({"from": ["Invalid date format. Use YYYY-MM-DD."]}, status=status.HTTP_400_BAD_REQUEST)
            
        to_date = request.query_params.get("to")
        if to_date:
            try:
                to_date = parse_date(to_date)
                if not to_date:
                    raise ValueError()
                queryset = queryset.filter(created_at__date__lte=to_date)
            except ValueError:
                return Response({"to": ["Invalid date format. Use YYYY-MM-DD."]}, status=status.HTTP_400_BAD_REQUEST)
        
        filename = f"posts_{timezone.now().strftime('%Y-%m-%d-%H-%M-%S')}.csv"
        response = StreamingHttpResponse(
            streaming_content=generate_csv_rows(queryset, CSV_FIELDS, ExportPostToCSVSerializer),
            content_type="text/csv; charset=utf-8-sig",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class ImportPostsFromCSVView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = ImportPostFromCSVSerializer

    @extend_schema(
        summary="Import Posts from CSV",
        description="Import multiple posts from a CSV file. Expected columns: title, content, category_name. Imported author is always the current authenticated admin.",
        request=ImportPostFromCSVSerializer,
        responses={
            200: OpenApiResponse(description="Import stats (total_rows, imported, skipped, errors)"),
            400: OpenApiResponse(
                description="Bad Request - Invalid or oversized file",
                response=inline_serializer(
                    name="ImportPostsFromCSVError",
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
                    name="ImportPostsToCSVUnauthorizedError",
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
                    name="ImportPostsToCSVForbiddenError",
                    fields={"detail": serializers.CharField()}
                ),
                examples=[
                    OpenApiExample(
                        "Forbidden",
                        value={"detail": "You do not have permission to perform this action."}
                    )
                ]
            ),
        },
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            try:
                result = import_posts_from_csv(serializer.validated_data["file"], request.user)
                return Response(result, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"file": [f"Error processing CSV: {str(e)}"]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            