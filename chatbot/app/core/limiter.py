"""
Per-client (IP) rate limiter shared across routers.

Kept in its own module so both main.py and the API routers can import the same
Limiter instance without a circular import. Uses slowapi's default in-process
storage, which is fine for the single-worker chatbot.

Behind the production edge (Cloudflare -> CloudFront -> ALB) the TCP peer is
always the ALB, so keying on it would put every visitor in one bucket. The key
is instead the client IP taken from X-Forwarded-For, counting
settings.proxy_hops entries from the right (each proxy appends the address it
received the request from, so only the entries our own proxies added are
trustworthy).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.config import get_settings

settings = get_settings()


def client_ip(request: Request) -> str:
    hops = settings.proxy_hops
    if hops > 0:
        forwarded = request.headers.get("x-forwarded-for", "")
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if len(parts) >= hops:
            return parts[-hops]
        if parts:
            # Fewer entries than expected proxies (e.g. an internal caller):
            # the leftmost is the closest thing to a client address.
            return parts[0]
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip)
