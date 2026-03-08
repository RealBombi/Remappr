import json
import sys

def send_message(msg_dict):
    try:
        sys.stdout.write(json.dumps(msg_dict) + "\n")
        sys.stdout.flush()
    except Exception:
        pass

def read_messages():
    """Generator to continuously yield parsed JSON commands from stdin."""
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)
        except json.JSONDecodeError as e:
            send_message({"type": "error", "message": f"Invalid JSON received: {e}"})
        except Exception:
            break
