
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    
    # API routes
    path("create", views.create_post, name="create_post"),
    path("all/", views.all_posts, name="all_posts"),
    path("following/", views.following_posts, name="following_posts"),
    path("update/<int:post_id>", views.update_post, name="update_post"),
    path("<str:url_username>/", views.profile, name="profile"),
    path("<str:url_username>/follow", views.follow, name="follow"),
    path("<str:url_username>/unfollow", views.unfollow, name="unfollow"),
]
