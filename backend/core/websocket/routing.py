from django.urls import re_path # type: ignore

from apps.issues.consumers import IssueBoardConsumer
from apps.notifications.consumers import NotificationConsumer
from apps.wiki.consumers import WikiPageConsumer

websocket_urlpatterns = [
    re_path(
        r"^ws/wiki/pages/(?P<page_id>[0-9a-f-]+)/$",
        WikiPageConsumer.as_asgi(),
    ),
    re_path(
        r"^ws/notifications/$",
        NotificationConsumer.as_asgi(),
    ),
    re_path(
        r"^ws/projects/(?P<project_id>[0-9a-f-]+)/board/$",
        IssueBoardConsumer.as_asgi(),
    ),
]
