from drf_spectacular.utils import inline_serializer, extend_schema, OpenApiParameter, OpenApiExample, OpenApiResponse
from rest_framework import generics, permissions, status, serializers, exceptions
from django.db.models import Q
from drf_spectacular.types import OpenApiTypes
from .models import Tag
from .serializers import TagSerializer
from rest_framework import mixins
from django.http import Http404

class TagListCreateView(generics.ListCreateAPIView):
    queryset = Tag.objects.all().order_by('name')
    serializer_class = TagSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(name__icontains=q)
        return qs

    @extend_schema(
        summary="List tags",
        description="Returns all tags. Supports search via 'q' parameter. No pagination.",
        parameters=[
            OpenApiParameter(
                name="q",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Search tag by name (icontains)"
            )
        ],
        responses={200: TagSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create tag",
        description="Creates a new tag. Slug is automatically generated from name. Name must be unique.",
        request=TagSerializer,
        responses={
            201: TagSerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="TagCreateValidationError",
                    fields={
                        "name": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(
                        name="Duplicate name",
                        summary="Name already exists",
                        value={"name": ["A tag with this name already exists."]}
                    ),
                    OpenApiExample(
                        name="Missing name",
                        summary="Missing name field",
                        value={"name": ["This field is required."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="TagCreateUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            )
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

class TagDetailUpdateDeleteView(mixins.UpdateModelMixin, mixins.DestroyModelMixin, generics.GenericAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    http_method_names = ['patch', 'delete']

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            raise exceptions.NotFound("Not found.") from None

    @extend_schema(
        summary="Update tag",
        description="Updates tag name. Slug will be regenerated. Name must be unique.",
        request=TagSerializer,
        responses={200: TagSerializer,
            400: OpenApiResponse(
                response=inline_serializer(
                    name="TagUpdateValidationError",
                    fields={
                        "name": serializers.ListField(child=serializers.CharField(), required=False)
                    }
                ),
                description="Bad Request",
                examples=[
                    OpenApiExample(
                        name="Duplicate name",
                        summary="Name already exists",
                        value={"name": ["A tag with this name already exists."]}
                    ),
                    OpenApiExample(
                        name="Missing name",
                        summary="Missing name field",
                        value={"name": ["This field is required."]}
                    )
                ]
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name="TagUpdateUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="TagUpdateNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not Found",
                examples=[
                    OpenApiExample(
                        name="Not Found",
                        value={"detail": "Not found."}
                    )
                ]
            )
        }
    )
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Delete tag",
        description="Performs a hard delete of the tag. All post-tag associations will be deleted (cascade).",
        responses={
            204: OpenApiTypes.NONE, 
            401: OpenApiResponse(
                response=inline_serializer(
                    name="TagDeleteUnauthorizedError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Unauthorized",
                examples=[
                    OpenApiExample(
                        name="Unauthorized",
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            404: OpenApiResponse(
                response=inline_serializer(
                    name="TagDeleteNotFoundError",
                    fields={"detail": serializers.CharField()}
                ),
                description="Not Found",
                examples=[
                    OpenApiExample(
                        name="Not Found",
                        value={"detail": "Not found."}
                    )
                ]
            )
        }
    )
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)
