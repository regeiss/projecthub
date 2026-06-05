from celery import shared_task


@shared_task(bind=True, max_retries=3, queue="notifications")
def send_admin_notification(self, access_request_id: str, admin_member_id: str):
    pass


@shared_task(bind=True, max_retries=3, queue="notifications")
def send_requester_email(self, access_request_id: str, outcome: str, extra: dict = None):
    pass
