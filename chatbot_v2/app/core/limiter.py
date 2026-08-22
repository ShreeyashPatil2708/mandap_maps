"""
Per-client (IP) rate limiter shared across routers.

Kept in its own module so both main.py and the API routers can import the same
Limiter instance without a circular import. Uses slowapi's default in-process
storage, which is fine for a single worker / small deployment; for multi-worker
setups point it at Redis via a storage_uri or enforce limits at the AWS edge
(API Gateway throttling / WAF rate rules).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
