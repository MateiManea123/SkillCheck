from django.urls import path
from . import views

urlpatterns=[
    path("",views.homepage,name="home"),
    path("about/",views.about),
    path("api/sessions/",views.start_session),
    path("api/sessions/<int:session_id>/",views.session_details),
    path("api/sessions/<int:session_id>/current-question/",views.current_question),
    path("api/sessions/<int:session_id>/answer/",views.submit_answer),
    path("api/sessions/<int:session_id>/end/",views.end_session),
]