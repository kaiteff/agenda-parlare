import pytz
from datetime import datetime, timedelta

MX_TZ = pytz.timezone('America/Mexico_City')
mx_now = datetime.now(MX_TZ)
tomorrow = mx_now + timedelta(days=1)
day_str = tomorrow.strftime('%Y-%m-%d')
start_iso = f"{day_str}T00:00:00"
next_day = tomorrow + timedelta(days=1)
end_iso = f"{next_day.strftime('%Y-%m-%d')}T08:00:00"

print(f"mx_now: {mx_now}")
print(f"tomorrow: {tomorrow}")
print(f"day_str: {day_str}")
print(f"start_iso: {start_iso}")
print(f"end_iso: {end_iso}")
