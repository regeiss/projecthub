"""Shared utilities for notifications."""


def extract_tiptap_mentions(content) -> list[str]:
    """
    Recursively traverse TipTap JSON and return unique member IDs
    from mention nodes (type=="mention", attrs.id).
    """
    if not content:
        return []
    ids: list[str] = []

    def traverse(node):
        if isinstance(node, dict):
            if node.get("type") == "mention":
                member_id = (node.get("attrs") or {}).get("id")
                if member_id:
                    ids.append(str(member_id))
            for child in node.get("content", []):
                traverse(child)
        elif isinstance(node, list):
            for item in node:
                traverse(item)

    traverse(content)
    return list(set(ids))
