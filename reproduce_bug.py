from pydantic import BaseModel
from typing import Optional, List
import json

class MessageCreateHelper(BaseModel):
    title: str
    content: str
    target_type: str
    target_value: Optional[str] # Missing = None
    channels: List[str] = ["INBOX"]

try:
    # Simulate payload from frontend where target_value is missing
    payload = {
        "title": "Test",
        "content": "Content",
        "target_type": "ALL",
        "channels": ["telegram"]
    }
    
    print("Attempting to parse payload without target_value...")
    m = MessageCreateHelper(**payload)
    print("Success:", m)
except Exception as e:
    print("Validation Error:", e)
