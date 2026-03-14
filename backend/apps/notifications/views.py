from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """GET /notifications/ — lista notificações do usuário autenticado."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        unread_only = self.request.query_params.get("unread")
        if unread_only in ("1", "true", "True"):
            qs = qs.filter(is_read=False)
        return qs


class NotificationUnreadCountView(APIView):
    """GET /notifications/unread-count/ — contagem de não lidas."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count})


class NotificationMarkReadView(APIView):
    """POST /notifications/{pk}/read/ — marca uma notificação como lida."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])

        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    """POST /notifications/mark-all-read/ — marca todas como lidas."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({"marked_read": updated})


class NotificationDeleteView(generics.DestroyAPIView):
    """DELETE /notifications/{pk}/ — remove uma notificação."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
