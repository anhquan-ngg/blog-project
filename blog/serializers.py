from rest_framework import serializers
from blog.models import Post, Comment
from django.contrib.auth.models import User

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')  
    post = serializers.ReadOnlyField(source='post.title')         

    class Meta:
        model = Comment
        fields = ['id', 'author', 'post', 'content', 'created_at']

class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username') 
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author', 'comments', 'created_at', 'updated_at']

class UserSerializer(serializers.ModelSerializer):
    posts = serializers.PrimaryKeyRelatedField(many = True, read_only = True)
    comments = serializers.PrimaryKeyRelatedField(many = True, read_only = True)
    
    class Meta: 
        model = User
        fields = ['id', 'username', 'posts', 'comments']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta: 
        model = User
        fields = ['username', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username = validated_data['username'],
            password = validated_data['password']
        )
        return user
