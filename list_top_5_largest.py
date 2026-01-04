#!/usr/bin/env python3
# Lists the top 5 largest files
import os

def get_file_sizes(directory="."\):
    file_sizes = []
    for filename in os.listdir(directory\):
        filepath = os.path.join(directory, filename\)
        if os.path.isfile(filepath\):
            size = os.path.getsize(filepath\)
            file_sizes.append((filename, size\))
    return file_sizes

def get_top_5_largest(file_sizes\):
    return sorted(file_sizes, key=lambda x: x[1], reverse=True)[:5]

def format_size(size_in_bytes\):
    return size_in_bytes / (1024 * 1024)

def print_results(top_files\):
    print("Top 5 Largest Files:"\)
    print("-" * 50\)
    for rank, (filename, size_bytes\) in enumerate(top_files, 1\):
        size_mb = format_size(size_bytes\)
        print(f"{rank}. {filename:<30} {size_mb:>8.2f} MB"\)

def save_to_file(top_files, output_file="largest_files.txt"\):
    with open(output_file, "w"\) as f:
        f.write("Top 5 Largest Files in Current Directory
"\)
        f.write("=" * 50 + "

"\)
        for rank, (filename, size_bytes\) in enumerate(top_files, 1\):
            size_mb = format_size(size_bytes\)
            f.write(f"{rank}. {filename:<30} {size_mb:>8.2f} MB
"\)
    print(f"
Results saved to '{output_file}'"\)
def main\):
    file_sizes = get_file_sizes(\)
    top_5_files = get_top_5_largest(file_sizes\)
    print_results(top_5_files\)
    save_to_file(top_5_files\)
if __name__ == '__main__':
    main(\)
