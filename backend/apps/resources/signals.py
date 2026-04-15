# backend/apps/resources/signals.py
import datetime

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import TimeEntry


@receiver(post_save, sender=TimeEntry)
@receiver(post_delete, sender=TimeEntry)
def trigger_sync_labor_costs(sender, instance, **kwargs):
    from .tasks import sync_labor_costs

    entry_date = instance.date
    if isinstance(entry_date, str):
        entry_date = datetime.date.fromisoformat(entry_date)

    sync_labor_costs.apply_async(
        kwargs={
            'issue_id': str(instance.issue_id),
            'year': entry_date.year,
            'month': entry_date.month,
        },
        countdown=30,
    )
