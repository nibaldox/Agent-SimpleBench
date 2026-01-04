import os

def get_file_sizes():
    """Return a list of (filename, size_bytes) for all files in current directory (non-recursive)."""
    sizes = []
    for entry in os.scandir('.'):
        if entry.is_file():
            try:
                size = entry.stat().st_size
                sizes.append((entry.name, size))
            except OSError:
                continue
    return sizes

def bytes_to_mb(bytes_val):
    """Convert bytes to megabytes (rounded to 2 decimal places)."""
    return round(bytes_val / (1024 * 1024), 2)

def list_top_largest_files(n=5):
    """Return list of top n largest files as list of tuples (filename, size_mb)."""
    sizes = get_file_sizes()
    sizes.sort(key=lambda x: x[1], reverse=True)
    top = sizes[:n]
    top_mb = [(name, bytes_to_mb(size)) for name, size in top]
    return top_mb

def save_to_file(data, filename='largest_files.txt'):
    """Save the list of files to a text file."""
    with open(filename, 'w') as f:
        for name, size_mb in data:
            f.write(f"{name}: {size_mb} MB\n")

def main():
    top_files = list_top_largest_files(5)
    for name, size_mb in top_files:
        print(f"{name}: {size_mb} MB")
    save_to_file(top_files, 'largest_files.txt')

if __name__ == "__main__":
    main()