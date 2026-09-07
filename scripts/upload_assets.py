#!/usr/bin/env python3
"""
Upload files to the Supabase `assets` bucket and print their public URLs.

Instagram and Facebook fetch media server-side, so anything published has to
live at a public HTTPS URL first. This is that step.

    python3 scripts/upload_assets.py carousels/002 store-assets/.../out/slide-*.png

Prints one URL per line, in the order given, which is the order a carousel
will show them in.
"""
import mimetypes, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "assets"


def env():
    out = {}
    for line in (ROOT / ".env").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def upload(base, key, prefix, path: Path):
    dest = f"{prefix}/{path.name}".strip("/")
    url = f"{base}/storage/v1/object/{BUCKET}/{dest}"
    ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    req = urllib.request.Request(
        url, data=path.read_bytes(), method="POST",
        headers={"Authorization": f"Bearer {key}",
                 "Content-Type": ctype,
                 "x-upsert": "true"},
    )
    try:
        urllib.request.urlopen(req, timeout=60).read()
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        sys.exit(f"upload failed for {path.name}: {e.code} {body}")
    return f"{base}/storage/v1/object/public/{BUCKET}/{dest}"


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: upload_assets.py <prefix> <file> [file ...]")
    e = env()
    base = e.get("EXPO_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = e.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not key:
        sys.exit("EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env")

    prefix = sys.argv[1]
    for arg in sys.argv[2:]:
        p = Path(arg)
        if not p.exists():
            sys.exit(f"no such file: {p}")
        print(upload(base, key, prefix, p))


if __name__ == "__main__":
    main()
