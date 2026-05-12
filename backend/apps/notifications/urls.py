from django.urls import path

from .views import (
    NotificationArchiveView,
    NotificationCountsView,
    NotificationDeleteView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationMarkUnreadView,
    NotificationUnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("counts/", NotificationCountsView.as_view(), name="notification-counts"),
    path("mark-all-read/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("<uuid:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("<uuid:pk>/archive/", NotificationArchiveView.as_view(), name="notification-archive"),
    path("<uuid:pk>/unread/", NotificationMarkUnreadView.as_view(), name="notification-mark-unread"),
    path("<uuid:pk>/", NotificationDeleteView.as_view(), name="notification-delete"),
]
