import csv
import io
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import Resolver404, resolve
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.files.models import File
from apps.notifications.models import Notification
from apps.posts.models import Post
from apps.tags.models import Tag


class ApiOnlyRoutingTests(SimpleTestCase):
    def test_root_is_json_and_not_legacy_html(self):
        for path in ('/', '/api/'):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response['Content-Type'], 'application/json')
                self.assertEqual(response.json()['docs'], '/api/docs/')

    def test_legacy_pages_are_not_routed(self):
        for path in ('/login/', '/register/', '/search/', '/profile/', '/library/',
                     '/admin-portal/', '/post/create/', '/post/1/edit/', '/post/example/'):
            with self.subTest(path=path), self.assertRaises(Resolver404):
                resolve(path)

    def test_admin_docs_and_mobile_aliases_are_preserved(self):
        for path in ('/admin/login/', '/api/docs/', '/api/redoc/', '/api/schema/',
                     '/api/me/liked/', '/api/me/bookmarks/',
                     '/api/auth/me/liked/', '/api/auth/me/bookmarks/'):
            with self.subTest(path=path):
                self.assertIsNotNone(resolve(path).func)
        self.assertEqual(self.client.get('/admin/login/').status_code, 200)
        self.assertEqual(self.client.get('/api/docs/').status_code, 200)

    def test_openapi_document_remains_valid(self):
        from django.core.management import call_command
        call_command('spectacular', validate=True, fail_on_warn=True, stdout=io.StringIO())

    def test_html_accept_header_does_not_enable_browsable_api(self):
        response = self.client.get('/api/auth/me/', HTTP_ACCEPT='text/html')
        self.assertEqual(response.status_code, 406)
        self.assertEqual(response['Content-Type'], 'application/json')

    @override_settings(DEBUG=False)
    def test_static_admin_files_are_collectable(self):
        from django.contrib.staticfiles.finders import find
        self.assertIsNotNone(find('admin/css/base.css'))


class MobileApiContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.author = User.objects.create_user('writer', password='Writer1234')
        cls.reader = User.objects.create_user('reader', password='Reader1234')
        cls.admin = User.objects.create_user('manager', password='Manager1234', is_staff=True)
        cls.category = Category.objects.create(name='Training')
        cls.tag = Tag.objects.create(name='Running', slug='running')
        cls.post = Post.objects.create(
            author=cls.author, category=cls.category, title='First story',
            content=[{'type': 'paragraph', 'data': {'text': 'A mobile-ready story'}}],
        )
        cls.post.tags.add(cls.tag)
        cls.other_post = Post.objects.create(
            author=cls.author, category=cls.category, title='Another story',
            content=[{'type': 'paragraph', 'data': {'text': 'Related story'}}],
        )

    def setUp(self):
        self.api = APIClient()

    def authenticate(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        return token.key

    def test_guest_discovery_filter_search_pagination_and_reader(self):
        response = self.api.get('/api/posts/', {'limit': 1, 'offset': 0, 'tag': 'running'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['author']['id'], self.author.id)
        self.assertFalse(response.data['results'][0]['is_liked'])
        detail = self.api.get(f'/api/posts/{self.post.id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertIsInstance(detail.data['content'], list)
        search = self.api.get('/api/posts/search/', {'q': 'First'})
        self.assertEqual(search.status_code, 200)
        self.assertEqual(search.data['results'][0]['id'], self.post.id)
        for path in ('/api/categories/', '/api/tags/', f'/api/posts/{self.post.id}/related/'):
            with self.subTest(path=path):
                self.assertEqual(self.api.get(path).status_code, 200)

    def test_pagination_and_author_filter_contract(self):
        first = self.api.get('/api/posts/', {'limit': 1, 'author': self.author.id})
        self.assertEqual(first.data['count'], 2)
        self.assertIsNotNone(first.data['next'])
        second = self.api.get('/api/posts/', {'limit': 1, 'offset': 1, 'author': self.author.id})
        self.assertIsNone(second.data['next'])
        self.assertNotEqual(first.data['results'][0]['id'], second.data['results'][0]['id'])
        self.assertEqual(self.api.get('/api/posts/', {'category': 'invalid'}).status_code, 400)

    def test_taxonomy_admin_crud(self):
        self.authenticate(self.reader)
        self.assertEqual(self.api.post('/api/categories/', {'name': 'Forbidden'}).status_code, 403)
        self.assertEqual(self.api.post('/api/tags/', {'name': 'Reader tag'}).status_code, 201)
        self.authenticate(self.admin)
        for resource in ('categories', 'tags'):
            with self.subTest(resource=resource):
                payload = {'name': 'Mobile taxonomy'}
                if resource == 'categories':
                    payload['parent_id'] = None
                response = self.api.post(f'/api/{resource}/', payload, format='json')
                self.assertEqual(response.status_code, 201, response.data)
                path = f'/api/{resource}/{response.data["id"]}/'
                payload['name'] = 'Updated taxonomy'
                update = self.api.put if resource == 'categories' else self.api.patch
                edited = update(path, payload, format='json')
                self.assertEqual(edited.status_code, 200, edited.data)
                self.assertEqual(self.api.delete(path).status_code, 204)

    def test_registration_login_profile_logout_invalidates_token(self):
        credentials = {'username': 'newreader', 'email': 'new@example.com',
                       'password': 'FreshPass123', 'password_confirm': 'FreshPass123'}
        self.assertEqual(self.api.post('/api/auth/register/', credentials).status_code, 201)
        login = self.api.post('/api/auth/login/', credentials)
        self.assertEqual(login.status_code, 200)
        self.api.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        profile = self.api.patch('/api/auth/me/', {'first_name': 'Mobile'}, format='json')
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(self.api.get('/api/auth/me/').data['first_name'], 'Mobile')
        self.assertEqual(self.api.post('/api/auth/logout/').status_code, 204)
        self.assertEqual(self.api.get('/api/auth/me/').status_code, 401)

    def test_post_crud_enforces_ownership(self):
        self.authenticate(self.author)
        created = self.api.post('/api/posts/', {
            'title': 'Mobile creation', 'category': self.category.id, 'tags': [self.tag.id],
            'content': [{'type': 'header', 'data': {'text': 'Heading', 'level': 2}},
                        {'type': 'paragraph', 'data': {'text': 'Body'}}],
        }, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        path = f"/api/posts/{created.data['id']}/"
        self.assertEqual(self.api.patch(path, {'title': 'Edited'}, format='json').status_code, 200)
        self.authenticate(self.reader)
        self.assertEqual(self.api.patch(path, {'title': 'Not mine'}, format='json').status_code, 403)
        self.assertEqual(self.api.delete(path).status_code, 403)
        self.authenticate(self.author)
        self.assertEqual(self.api.delete(path).status_code, 204)
        self.assertEqual(self.api.get(path).status_code, 404)

    def test_likes_bookmarks_libraries_and_notification_ownership(self):
        self.authenticate(self.reader)
        with self.captureOnCommitCallbacks(execute=True):
            like = self.api.post(f'/api/posts/{self.post.id}/like/')
        self.assertEqual(like.status_code, 200)
        self.assertTrue(like.data['is_liked'])
        saved = self.api.post(f'/api/posts/{self.post.id}/bookmark/')
        self.assertTrue(saved.data['is_bookmarked'])
        for path in ('/api/me/liked/', '/api/me/bookmarks/', '/api/auth/me/liked/'):
            with self.subTest(path=path):
                self.assertEqual(self.api.get(path).data['results'][0]['id'], self.post.id)
        notification = Notification.objects.get(recipient=self.author, actor=self.reader)
        self.assertIn(self.api.patch(f'/api/notifications/{notification.id}/read/').status_code, (403, 404))
        self.authenticate(self.author)
        inbox = self.api.get('/api/notifications/')
        self.assertEqual(inbox.status_code, 200)
        self.assertEqual(inbox.data['results'][0]['post_id'], self.post.id)
        self.assertEqual(self.api.patch(f'/api/notifications/{notification.id}/read/').status_code, 200)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_comment_reply_edit_delete(self):
        self.authenticate(self.reader)
        path = f'/api/posts/{self.post.id}/comments/'
        created = self.api.post(path, {'content': 'Great story'}, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        comment_id = created.data['id']
        reply = self.api.post(path, {'content': 'A reply', 'parent_id': comment_id}, format='json')
        self.assertEqual(reply.status_code, 201, reply.data)
        self.assertEqual(self.api.patch(f'/api/comments/{comment_id}/',
                                       {'content': 'Updated'}, format='json').status_code, 200)
        self.assertEqual(self.api.get(path).status_code, 200)
        self.assertEqual(self.api.delete(f'/api/comments/{reply.data["id"]}/').status_code, 204)

    def test_image_upload_uses_native_multipart_contract(self):
        self.authenticate(self.author)
        from PIL import Image
        buffer = io.BytesIO()
        Image.new('RGB', (2, 2), color='white').save(buffer, format='PNG')
        image = SimpleUploadedFile('cover.png', buffer.getvalue(), content_type='image/png')
        record = File.objects.create(uploaded_by=self.author, url='https://example.com/cover.png',
                                     s3_key='uploads/cover.png')
        with patch('apps.files.views.upload_image', return_value=record) as upload:
            response = self.api.post('/api/files/upload/', {'image': image}, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['id'], record.id)
        upload.assert_called_once()

    def test_admin_permissions_ban_unban_and_csv_transfer(self):
        self.authenticate(self.reader)
        self.assertEqual(self.api.get('/api/admin/users/').status_code, 403)
        self.authenticate(self.admin)
        self.assertEqual(self.api.get('/api/admin/users/').status_code, 200)
        self.assertEqual(self.api.post(f'/api/admin/users/{self.reader.id}/ban/').status_code, 200)
        self.assertEqual(self.api.post(f'/api/admin/users/{self.reader.id}/unban/').status_code, 200)
        for resource in ('users', 'posts'):
            response = self.api.get(f'/api/admin/{resource}/export/')
            self.assertEqual(response.status_code, 200)
            rows = list(csv.reader(io.StringIO(b''.join(response.streaming_content).decode('utf-8-sig'))))
            self.assertGreaterEqual(len(rows), 2)
        upload = SimpleUploadedFile('users.csv', b'username,email,password\nimported,imported@example.com,ImportPass123\n', content_type='text/csv')
        imported = self.api.post('/api/admin/users/import/', {'file': upload}, format='multipart')
        self.assertEqual(imported.status_code, 200, imported.data)
        self.assertEqual(imported.data['imported'], 1)
        upload = SimpleUploadedFile('posts.csv', b'title,content,category_name\nImported story,Mobile text,Training\n', content_type='text/csv')
        imported = self.api.post('/api/admin/posts/import/', {'file': upload}, format='multipart')
        self.assertEqual(imported.status_code, 200, imported.data)
        self.assertEqual(imported.data['imported'], 1)
