"""
URL configuration for blog_project project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = []