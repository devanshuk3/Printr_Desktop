import boto3
from botocore.config import Config
import os
import tempfile

# Cloudflare R2 Configuration (Fetched from environment variables)
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "printr")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "5b7e44f7292198799e9cb30e8567ee58")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "7577359b563dee123ab264ef823aa817431f89f5b15517c8002d8f692c9b796a")
R2_ENDPOINT = os.getenv("R2_ENDPOINT", "https://7cff4c3d228e69e58138ff0417e28a00.r2.cloudflarestorage.com")

def get_r2_client():
    """Create and return an S3-compatible client for Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
        ),
    )


def list_vendor_files(vendor_id):
    """
    List all files in a vendor's R2 folder (Case-Insensitive).
    Checks prefixes: vendor_id/, VENDOR_ID/, and vendor_id/.
    Returns a unique list of dicts with file metadata.
    """
    client = get_r2_client()
    # Unique prefixes to check
    prefixes = list(set([f"{vendor_id}/", f"{vendor_id.upper()}/", f"{vendor_id.lower()}/"]))
    
    files = []
    seen_keys = set() # Avoid duplicates

    for prefix in prefixes:
        try:
            response = client.list_objects_v2(Bucket=R2_BUCKET_NAME, Prefix=prefix)
            contents = response.get("Contents", [])
            
            for obj in contents:
                key = obj["Key"]
                if key == prefix or key in seen_keys:
                    continue
                seen_keys.add(key)

                file_name = key.replace(prefix, "", 1)
                if not file_name or file_name.endswith("/"):
                    continue

                # Fetch metadata from companion .json file if it exists
                # Format expected: <filename>.json in the same folder
                json_key = f"{key}.json"
                page_count = "N/A"
                sender_name = "Guest User"
                sender_upi = "N/A"
                
                try:
                    # Check if JSON companion exists and read it
                    json_obj = client.get_object(Bucket=R2_BUCKET_NAME, Key=json_key)
                    import json
                    meta_data = json.loads(json_obj['Body'].read().decode('utf-8'))
                    
                    page_count = meta_data.get('page_count', 'N/A')
                    sender_name = meta_data.get('sender_name', 'Guest User')
                    sender_upi = meta_data.get('sender_upi', 'N/A')
                except:
                    # Fallback to headers metadata if JSON fetch fails
                    try:
                        head = client.head_object(Bucket=R2_BUCKET_NAME, Key=key)
                        meta = head.get('Metadata', {})
                        page_count = meta.get('pages', page_count)
                        sender_name = meta.get('sender-name', sender_name)
                        sender_upi = meta.get('sender-upi', sender_upi)
                    except:
                        pass

                parts = file_name.split("/")
                display_name = parts[-1]
                subfolder = "/".join(parts[:-1]) if len(parts) > 1 else None

                # Don't show JSON files in the list
                if display_name.endswith(".json"):
                    continue

                files.append({
                    "key": key,
                    "file_name": display_name,
                    "subfolder": subfolder,
                    "full_path": file_name,
                    "size": obj["Size"],
                    "size_display": format_file_size(obj["Size"]),
                    "last_modified": obj["LastModified"].isoformat(),
                    "etag": obj.get("ETag", "").strip('"'),
                    "page_count": page_count,
                    "sender_name": sender_name,
                    "sender_upi": sender_upi
                })

        except Exception as e:
            print(f"R2 Error listing folder '{prefix}': {e}")

    # Sort files by last modified date (newest first)
    files.sort(key=lambda x: x['last_modified'], reverse=True)
    return files


def get_file_download_url(key, expiry=3600):
    """
    Generate a pre-signed URL for downloading a file from R2.
    Default expiry is 1 hour.
    """
    client = get_r2_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": R2_BUCKET_NAME, "Key": key},
            ExpiresIn=expiry,
        )
        return url
    except Exception as e:
        print(f"R2 Error generating download URL for {key}: {e}")
        return None


def download_file_to_temp(key):
    """
    Download a file from R2 to a temporary location.
    Returns the temporary file path, or None on failure.
    """
    client = get_r2_client()
    try:
        file_name = key.split("/")[-1]
        _, ext = os.path.splitext(file_name)
        temp_fd, temp_path = tempfile.mkstemp(suffix=ext, prefix="printr_")
        os.close(temp_fd)

        client.download_file(R2_BUCKET_NAME, key, temp_path)
        return temp_path
    except Exception as e:
        print(f"R2 Error downloading {key}: {e}")
        return None


def delete_file(key):
    """Delete a file from R2 storage."""
    client = get_r2_client()
    try:
        client.delete_object(Bucket=R2_BUCKET_NAME, Key=key)
        return True
    except Exception as e:
        print(f"R2 Error deleting {key}: {e}")
        return False


def format_file_size(size_bytes):
    """Convert bytes to a human-readable file size."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"
