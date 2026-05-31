def extract_text_from_tiptap(content) -> str:
    """Recursively extract plain text from a TipTap JSON document."""
    if not content:
        return ""
    texts: list[str] = []

    def _traverse(node):
        if isinstance(node, dict):
            if node.get("type") == "text" and "text" in node:
                texts.append(node["text"])
            for child in node.get("content", []):
                _traverse(child)
        elif isinstance(node, list):
            for item in node:
                _traverse(item)

    _traverse(content)
    return " ".join(texts)
