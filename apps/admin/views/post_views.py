from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from apps.posts.models import Post
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework import status
from apps.admin.serializers.post_serializers import ExportPostToCSVSerializer, ImportPostFromCSVSerializer
from django.http import StreamingHttpResponse
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.admin.utils.csv_helpers import generate_csv_rows, import_posts_from_csv

CSV_FIELDS = [
    "id", "title", "author_username",
    "category_name", "tags", "content", "likes_count", "bookmarks_count", "created_at"
]


class ExportPostsToCSVView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        queryset = Post.objects.filter(is_deleted=False).prefetch_related("tags", "post_images").order_by("id")
        
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
            400: OpenApiResponse(description="Bad Request - Invalid or oversized file"),
            401: OpenApiResponse(description="Unauthorized - Token is missing or invalid"),
            403: OpenApiResponse(description="Forbidden - User is not an admin"),
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
            