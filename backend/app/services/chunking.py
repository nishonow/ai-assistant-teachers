from langchain_text_splitters import RecursiveCharacterTextSplitter

def split_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=80,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    return splitter.split_text(text)