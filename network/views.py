import json
import re

from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404
from django.db import IntegrityError
from django.http import JsonResponse
from django.urls import reverse
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from .models import User, Post, Like, Follower


def update_post(request, post_id): 
    any_post = get_object_or_404(Post, pk=post_id)

    if request.method == "PUT": 
        data = json.loads(request.body)
        
        post_to_edit = Post.objects.get(user=request.user, pk=post_id)

        if data.get("content") is not None:
            post_to_edit.content = data["content"]

        post_to_edit.save()

        return JsonResponse({"message": "Post edited successfully."}, status=204)
    

    elif request.method == "POST":
        like, created = Like.objects.get_or_create(post=any_post, user=request.user)
        
        if created:
            return JsonResponse({"message": "Like created successfully."}, status=201)
        else:
            return JsonResponse({"error": "User has already liked this post."}, status=400)


    elif request.method == "DELETE":
        try:
            like = Like.objects.get(post=any_post, user=request.user)
            like.delete()
            return JsonResponse({"message": "Like deleted successfully."}, status=204)
        except Like.DoesNotExist:
            return JsonResponse({"error": "User has not liked this post."}, status=400)


    return JsonResponse({"error": f"Invalid request to update post ${post_id}."}, status=400)


def paginated_posts(request, posts):
    print(request)
    default_page = 1
    paginator = Paginator(posts, 10)  # 10 items per page
    page = request.GET.get('page', default_page)

    try:
        current_page = paginator.page(page)
    except PageNotAnInteger:
        current_page = paginator.page(default_page)
    except EmptyPage:
        current_page = paginator.page(paginator.num_pages)

    return {
        'posts': current_page.object_list,
        'has_next': current_page.has_next(),
        'has_previous': current_page.has_previous(),
        'page_number': current_page.number,
        'num_pages': paginator.num_pages,
    }


def following_posts(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid mailbox."}, status=400)
    
    logged_user = request.user

    followed_users= []

    for user in logged_user.following.all():
        followed_users.append(user.following)

    posts = Post.objects.filter(user__in=followed_users)

    posts = posts.order_by("-timestamp").all()

    following_posts = []

    for post in posts:
        serialized_post = post.serialize()

        like_count = Like.objects.filter(post=post).count()
        user_liked_post = Like.objects.filter(post=post, user=request.user).exists()

        data_to_add = {
            "like_count": like_count,
            "user_liked_post": user_liked_post,
        }    

        serialized_post.update(data_to_add)

        following_posts.append(serialized_post)

    return JsonResponse(paginated_posts(request, following_posts), safe=False)


def all_posts(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request."}, status=400)

    posts = Post.objects.all()

    posts = posts.order_by("-timestamp").all()

    all_posts = []

    for post in posts:
        serialized_post = post.serialize()

        like_count = Like.objects.filter(post=post).count()
        user_liked_post = Like.objects.filter(post=post, user=request.user).exists()

        data_to_add = {
            "like_count": like_count,
            "user_liked_post": user_liked_post,
        }    

        serialized_post.update(data_to_add)

        all_posts.append(serialized_post)
    
    return JsonResponse(paginated_posts(request, all_posts), safe=False)


def clean_username_URL(username):
    to_clean_username = username

    # Remove unnecessary characters using regular expression
    cleaned_username = re.sub(r'[^a-zA-Z\s]', '', to_clean_username)

    # Remove extra spaces and ensure one space between each word
    final_username = ' '.join(cleaned_username.split())

    return final_username


def unfollow(request, url_username):
    if request.method != "DELETE":
        return JsonResponse({"error": "DELETE request required."}, status=400)
    
    # get the cleaned username from url
    username = clean_username_URL(url_username)
    # get the exact user from the username
    user_unfollow = get_object_or_404(User, username=username)

    delete_follower = Follower.objects.get(follower = request.user, following = user_unfollow)
    
    delete_follower.delete()

    return JsonResponse({"message": "Follower deleted successfully."}, status=201)


def follow(request, url_username):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    
    # get the cleaned username from url
    username = clean_username_URL(url_username)
    # get the exact user from the username
    user_follow = get_object_or_404(User, username=username)

    data = Follower(
        follower = request.user,
        following = user_follow,
    )
    data.save()

    return JsonResponse({"message": "Follower created successfully."}, status=201)


def profile(request, url_username):
    # get the cleaned username from url
    username = clean_username_URL(url_username)
    # get the exact user from the username
    user = get_object_or_404(User, username=username)
    # get all posts of user
    posts = Post.objects.filter(user=user)
    # filter posts to descending
    posts = posts.order_by("-timestamp").all()

    is_following = Follower.objects.filter(follower=request.user, following=user).exists()
    
    # this is the ultimate list for all data
    profile = []

    # first into user_profile
    user_info = {
        "not_me": request.user != user,
        "username": user.username,
        "is_following": is_following,
        "followers": user.followers.all().count(),
        "following": user.following.all().count(),
    }
    # append all user's info to profile
    profile.append(user_info)

    # the next data struct to append to profile
    user_posts = []

    # iterate to get all posts to put into "posts" list
    for post in posts:
        serialized_post = post.serialize()

        # data to add
        like_count = Like.objects.filter(post=post).count()
        user_liked_post = Like.objects.filter(post=post, user=request.user).exists()

        data_to_add = {
            "like_count": like_count,
            "user_liked_post": user_liked_post,
        }    

        # add to dictionary
        serialized_post.update(data_to_add)

        user_posts.append(serialized_post)
    
    # append all user's posts with pagination to profile list
    profile.append(paginated_posts(request, user_posts))
    
    return JsonResponse(profile, safe=False)
    

def create_post(request):
    # Composing a new email must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    
    # get data from post
    data = json.loads(request.body)

    print(data)

    # get content of post
    content = data.get("content", "")
    
    # insert post to the Post Model
    post = Post(
        user = request.user,
        content = content,
    ) 
    post.save()

    return JsonResponse({"message": "Post created successfully."}, status=201)


def index(request):
    # Authenticated users view their inbox
    if request.user.is_authenticated:
        posts = Post.objects.all()

        post_likes = {}
        is_liked = {}


        for post in posts:
            like_count = Like.objects.filter(post=post).count()
            user_liked_post = Like.objects.filter(post=post, user=request.user).exists()
            
            post_likes[post.id] = like_count
            is_liked[post.id] = user_liked_post

        return render(request, "network/index.html", {
            "all_posts": posts.order_by('-timestamp'),
            "post_likes": post_likes,
            "is_liked": is_liked,
        })

    # Everyone else is prompted to sign in
    else:
        return HttpResponseRedirect(reverse("login"))


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")
