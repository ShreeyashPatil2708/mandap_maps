"""
Per-client (IP) rate limiter shared across routers.

Kept in its own module so both main.py and the API routers can import the same
Limiter instance without a circular import. Uses slowapi's default in-process
storage, which is fine for a single worker / small deployment; for multi-worker
setups point it at Redis via a storage_uri or enforce limits at the AWS edge
(API Gateway throttling / WAF rate rules).
"""
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _client_ip(request: Request) -> str:
    """Resolve the real client IP.

    Behind CloudFront -> API Gateway -> NLB the socket peer is an AWS hop, so
    get_remote_address() would bucket every visitor under one shared upstream IP
    and make the limit effectively global. The original client is the first hop
    of X-Forwarded-For (CloudFront/API Gateway prepend it). Fall back to the
    socket address for local/dev where no proxy sets the header.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip)
