from rest_framework.routers import DefaultRouter

from .views import IdeaFieldDefinitionViewSet, IdeaViewSet, IdeaViewViewSet

router = DefaultRouter()
router.register("ideas", IdeaViewSet, basename="discovery-idea")
router.register("fields", IdeaFieldDefinitionViewSet, basename="discovery-field")
router.register("views", IdeaViewViewSet, basename="discovery-view")

urlpatterns = router.urls

