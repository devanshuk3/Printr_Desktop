import boto3
import os
import tempfile
from botocore.config import Config
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import json

# R2 Configuration (Load from Environment Variables)
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "printr-storage")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "5b7e44f7292198799e9cb30e8567ee58")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "7577359b563dee123ab264ef823aa817431f89f5b15517c8002d8f692c9b796a")
R2_ENDPOINT = os.getenv("R2_ENDPOINT", "https://7cff4c3d228e69e58138ff0417e28a00.r2.cloudflarestorage.com")

def get_r2_client():
    """Create and return a boto3 client for Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4", region_name="auto"),
    )

def format_file_size(size_in_bytes):
    """Helper to convert bytes into human-readable format."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_in_bytes < 1024.0:
            return f"{size_in_bytes:.1f} {unit}"
        size_in_bytes /= 1024.0
    return f"{size_in_bytes:.1f} TB"

def list_vendor_files(vendor_id):
    """
    List all pending print files for a vendor with case-insensitive logic.
    Optimized: Uses multi-threading (parallel calls) for 5-10x faster metadata fetching.
    """
    client = get_r2_client()
    prefixes = [f"{vendor_id}/", f"{vendor_id.upper()}/", f"{vendor_id.lower()}/"]
    
    all_objects = []
    seen_keys = set()
    
    try:
        # Step 1: List all basic objects across prefixes
        for prefix in set(prefixes): # deduplicate prefix variations
            response = client.list_objects_v2(Bucket=R2_BUCKET_NAME, Prefix=prefix)
            if "Contents" in response:
                for obj in response["Contents"]:
                    if obj["Key"] not in seen_keys:
                        all_objects.append(obj)
                        seen_keys.add(obj["Key"])

        if not all_objects:
            return []

        # Step 2: Filter out JSON files and prepare for metadata fetch
        valid_objs = [obj for obj in all_objects if not obj["Key"].endswith(".json") and not obj["Key"].endswith("/")]

        # Step 3: Parallelize metadata fetching for all valid files
        # Each file needs a HEAD call + a potential GET call for JSON companion
        files = []
        
        def process_single_file(obj):
            key = obj["Key"]
            file_name = key.split("/")[-1]
            json_key = f"{key}.json"
            
            page_count, sender_name, sender_upi = "N/A", "Guest User", "N/A"
            
            # 1. Try to fetch companion JSON
            try:
                json_obj = client.get_object(Bucket=R2_BUCKET_NAME, Key=json_key)
                meta_data = json.loads(json_obj['Body'].read().decode('utf-8'))
                page_count = meta_data.get('page_count', 'N/A')
                sender_name = meta_data.get('sender_name', sender_name)
                sender_upi = meta_data.get('sender_upi', sender_upi)
            except:
                # 2. Fallback to S3 metadata headers
                try:
                    head = client.head_object(Bucket=R2_BUCKET_NAME, Key=key)
                    meta = head.get('Metadata', {})
                    page_count = meta.get('pages', page_count)
                    sender_name = meta.get('sender-name', sender_name)
                    sender_upi = meta.get('sender-upi', sender_upi)
                except:
                    pass

            return {
                "key": key,
                "file_name": file_name,
                "size": obj["Size"],
                "size_display": format_file_size(obj["Size"]),
                "last_modified": obj["LastModified"],
                "page_count": page_count,
                "sender_name": sender_name,
                "sender_upi": sender_upi
            }

        # Run up to 10 parallel threads to fetch metadata
        with ThreadPoolExecutor(max_workers=10) as executor:
            files = list(executor.map(process_single_file, valid_objs))

        # Step 4: Sort by date descending
        files.sort(key=lambda x: x["last_modified"], reverse=True)
        
        # Convert datetime to string for frontend serialization
        for f in files:
            f["last_modified"] = f["last_modified"].isoformat()

        return files

    except Exception as e:
        print(f"R2 Fetch Error: {e}")
        return []

def download_file_to_temp(file_key):
    """Download an R2 file to an OS temporary directory and return its path."""
    client = get_r2_client()
    try:
        # Create a stable but temporary path
        file_name = file_key.split("/")[-1]
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"printr_{file_name}")
        
        with open(temp_path, "wb") as f:
            client.download_fileobj(R2_BUCKET_NAME, file_key, f)
        
        return temp_path
    except Exception as e:
        print(f"Download Error: {e}")
        return None

def delete_file(file_key):
    """Directly delete a file and its companion JSON from R2."""
    client = get_r2_client()
    try:
        # Delete file and companion JSON
        client.delete_object(Bucket=R2_BUCKET_NAME, Key=file_key)
        try:
            client.delete_object(Bucket=R2_BUCKET_NAME, Key=f"{file_key}.json")
        except:
            pass
        return True
    except Exception as e:
        print(f"Delete Error: {e}")
        return False

def get_file_download_url(file_key):
    """Generate a pre-signed URL for a file (useful for external openers)."""
    client = get_r2_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": R2_BUCKET_NAME, "Key": file_key},
            ExpiresIn=3600,
        )
        return url
    except Exception as e:
        print(f"URL Gen Error: {e}")
        return None
