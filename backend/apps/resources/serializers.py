from rest_framework import serializers
from apps.projects.models import ProjectMember
from .models import MemberCapacity, ResourceProfile, TimeEntry


class ResourceProfileSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)
    member_avatar = serializers.CharField(source='member.avatar_url', read_only=True)

    class Meta:
        model = ResourceProfile
        fields = [
            'id', 'project', 'member', 'member_name', 'member_avatar',
            'daily_rate_brl', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        project = data.get('project') or (self.instance.project if self.instance else None)
        member = data.get('member') or (self.instance.member if self.instance else None)
        if project and member:
            if not ProjectMember.objects.filter(project=project, member=member).exists():
                raise serializers.ValidationError(
                    {'member': 'Membro não pertence ao projeto.'}
                )
        return data


class MemberCapacitySerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)

    class Meta:
        model = MemberCapacity
        fields = ['id', 'member', 'member_name', 'year', 'month', 'available_days', 'note']
        read_only_fields = ['id']

    def validate(self, data):
        month = data.get('month')
        if month is not None and not (1 <= month <= 12):
            raise serializers.ValidationError({'month': 'Mês deve ser entre 1 e 12.'})
        year = data.get('year')
        if year is not None and not (2020 <= year <= 2099):
            raise serializers.ValidationError({'year': 'Ano deve ser entre 2020 e 2099.'})
        return data


class TimeEntrySerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)
    member_avatar = serializers.CharField(source='member.avatar_url', read_only=True)
    issue_title = serializers.CharField(source='issue.title', read_only=True)
    issue_sequence_id = serializers.IntegerField(source='issue.sequence_id', read_only=True)
    project_id = serializers.UUIDField(source='issue.project_id', read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'issue', 'issue_title', 'issue_sequence_id', 'project_id',
            'member', 'member_name', 'member_avatar',
            'date', 'hours', 'description', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def update(self, instance, validated_data):
        raise serializers.ValidationError(
            'TimeEntry é imutável. Crie um novo lançamento de correção.'
        )
