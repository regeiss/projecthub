from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Formata todas as respostas de erro como:
    {"error": "mensagem legível", "code": "error_code", "details": {...}}
    """
    response = exception_handler(exc, context)

    if response is not None:
        original_data = response.data
        response.data = {
            "error": _extract_message(original_data),
            "code": getattr(exc, "default_code", "error"),
            "details": original_data,
        }

    return response


def _extract_message(data):
    if isinstance(data, dict):
        for value in data.values():
            if isinstance(value, list) and value:
                return str(value[0])
            if isinstance(value, str):
                return value
        return "Erro na requisição."
    if isinstance(data, list) and data:
        return str(data[0])
    return str(data)


class BusinessError(APIException):
    """Erro de regra de negócio — HTTP 422."""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Erro de negócio."
    default_code = "business_error"
