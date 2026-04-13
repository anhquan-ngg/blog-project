from rest_framework import serializers
from django.utils.text import slugify
from django.db import IntegrityError
from .models import Tag

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("This field is required.")
        
        # Check uniqueness ignoring case (for create)
        # For update, we need to exclude instance, but ModelSerializer handle some of this.
        # However, design specifically asks for name__iexact and slug check.
        
        instance = getattr(self, 'instance', None)
        qs = Tag.objects.filter(name__iexact=name)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        
        if qs.exists():
            raise serializers.ValidationError("A tag with this name or a similar name (slug) already exists.")
            
        return name

    def create(self, validated_data):
        name = validated_data['name']
        slug = slugify(name)
        
        try:
            return Tag.objects.create(name=name, slug=slug)
        except IntegrityError:
            raise serializers.ValidationError({"name": "A tag with this name or a similar name (slug) already exists."}) from None

    def update(self, instance, validated_data):
        name = validated_data.get('name', instance.name)
        slug = slugify(name)
        
        try:
            instance.name = name
            instance.slug = slug
            instance.save()
            return instance
        except IntegrityError:
            raise serializers.ValidationError({"name": "A tag with this name or a similar name (slug) already exists."}) from None
