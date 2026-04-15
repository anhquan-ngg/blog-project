# utils/csv_helpers.py
import csv
import io

def generate_csv_rows(queryset, fields):
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
    for obj in queryset.values(*fields):
        writer.writerow([obj[field] for field in fields])
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate()

from django.contrib.auth.models import User

def import_users_from_csv(file):
    decoded = file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    total_rows = 0
    imported = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):  # start=2 (row 1 là header)
        total_rows += 1
        try:
            User.objects.create_user(
                username=row["username"],
                email=row["email"],
                password=row["password"],
                first_name=row.get("first_name", ""),
                last_name=row.get("last_name", ""),
            )
            imported += 1
        except Exception as e:
            errors.append({"row": row_num, "reason": str(e)})

    return {
        "total_rows": total_rows,
        "imported": imported,
        "skipped": total_rows - imported,
        "errors": errors,
    }