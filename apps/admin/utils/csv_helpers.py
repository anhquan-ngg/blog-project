import csv
import io
import json
from django.contrib.auth.models import User
from apps.admin.serializers.post_serializers import PostCSVRowSerializer
from apps.admin.serializers.user_serializers import UserCSVRowSerializer


def _csv_cell_value(value):
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return value

def generate_csv_rows(queryset, fields, serializer_class=None):
    """
    Generator yield từng dòng CSV dưới dạng string.
    Dùng với StreamingHttpResponse để tránh load toàn bộ data vào RAM.
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    # Header row
    writer.writerow(fields)
    yield buffer.getvalue()
    buffer.seek(0)
    buffer.truncate()

    # Data rows
    if serializer_class:
        for obj in queryset:
            data = serializer_class(obj).data
            writer.writerow([_csv_cell_value(data.get(field, "")) for field in fields])
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate()
    else:
        for obj in queryset.values(*fields):
            writer.writerow([_csv_cell_value(obj.get(field, "")) for field in fields])
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate()

def import_users_from_csv(file):
    decoded = file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    total_rows = 0
    imported = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):  # start=2 (row 1 là header)
        total_rows += 1
        try:
            # Lấy data và bắt lỗi KeyError nếu file csv thiếu cột cần thiết
            data = {
                "username": row["username"],
                "email": row["email"],
                "password": row["password"],
                "first_name": row.get("first_name", ""),
                "last_name": row.get("last_name", ""),
            }
            serializer = UserCSVRowSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                imported += 1
            else:
                errors.append({"row": row_num, "reason": serializer.errors})
        except KeyError as e:
            errors.append({"row": row_num, "reason": f"Missing required column: {e!s}"})
        except Exception as e:
            errors.append({"row": row_num, "reason": str(e)})

    return {
        "total_rows": total_rows,
        "imported": imported,
        "skipped": total_rows - imported,
        "errors": errors,
    }


def import_posts_from_csv(file, author):
    decoded = file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))

    total_rows = 0
    imported = 0
    errors = []
    required_headers = {"title", "content", "category_name"}

    normalized_headers = {
        ((name or "").strip().lower().lstrip("\ufeff"))
        for name in (reader.fieldnames or [])
    }
    missing_headers = sorted(required_headers - normalized_headers)
    if missing_headers:
        return {
            "total_rows": 0,
            "imported": 0,
            "skipped": 0,
            "errors": [
                {
                    "row": 1,
                    "reason": f"Missing required column(s): {', '.join(missing_headers)}",
                }
            ],
        }

    for row_num, row in enumerate(reader, start=2):
        total_rows += 1
        try:
            normalized_row = {
                ((key or "").strip().lower().lstrip("\ufeff")): value
                for key, value in row.items()
            }
            data = {
                "title": normalized_row["title"],
                "content": normalized_row["content"],
                "category_name": normalized_row["category_name"],
            }
            serializer = PostCSVRowSerializer(data=data, context={"author": author})
            if serializer.is_valid():
                serializer.save()
                imported += 1
            else:
                errors.append({"row": row_num, "reason": serializer.errors})
        except KeyError as e:
            errors.append({"row": row_num, "reason": f"Missing required column: {e!s}"})
        except Exception as e:
            errors.append({"row": row_num, "reason": str(e)})

    return {
        "total_rows": total_rows,
        "imported": imported,
        "skipped": total_rows - imported,
        "errors": errors,
    }
    