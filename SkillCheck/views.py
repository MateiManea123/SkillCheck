from django.http import HttpResponse
from django.shortcuts import render
def homepage(request):
    return render(request, 'home.html')
    # return HttpResponse("Hello, world. You're at the polls page.")
def about(request):
     return HttpResponse("Hello, world. You're at the about page.")