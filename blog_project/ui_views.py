from django.shortcuts import render
from django.contrib.auth.decorators import login_required, user_passes_test


def home_page(request):
    return render(request, "home.html")


def login_page(request):
    return render(request, "auth/login.html")


def register_page(request):
    return render(request, "auth/register.html")

def post_detail_page(request, slug):
    return render(request, "post/post_detail.html", {"slug": slug})

def post_create_page(request):
    return render(request, "post/post_create.html")
    
def post_edit_page(request, pk):
    return render(request, "post/post_edit.html", {"pk": pk})

def search_page(request):
    query = request.GET.get("q", "")
    return render(request, "search.html", {"query": query})

def profile_page(request):
    return render(request, "profile.html")

def library_page(request):
    return render(request, "library.html")


@login_required(login_url="/login/")
@user_passes_test(lambda u: u.is_staff, login_url="/login/")
def admin_portal_page(request):
    return render(request, "admin_portal.html")
