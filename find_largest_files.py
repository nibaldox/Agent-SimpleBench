import os
import glob

def get_file_size_mb(filepath):
    """Get file size in MB rounded to 2 decimal places."""
    size_bytes = os.path.getsize(filepath)
    size_mb = size_bytes / (1024 * 1024)
    return round(size_mb, 2)

def get_all_files():
    """Get all files in the current directory (excluding subdirectories)."""
    return glob.glob('*.*')

def get_top_largest_files(num_files=5):
    """Get the top N largest files in the current directory."""
    files = get_all_files()
    
    # Filter out directories and get file info
    file_info = []
    for filepath in files:
        if os.path.isfile(filepath):
            size_mb = get_file_size_mb(filepath)
            file_info.append((filepath, size_mb))
    
    # Sort by size (descending) and get top N
    file_info.sort(key=lambda x: x[1], reverse=True)
    return file_info[:num_files]

def print_top_files(top_files):
    """Print the top largest files with their sizes."""
    print(f"Top {len(top_files)} largest files in current directory:")
    print("-" * 50)
    for i, (filename, size_mb) in enumerate(top_files, 1):
        print(f"{i}. {filename}: {size_mb} MB")

def save_to_file(top_files, output_file='largest_files.txt'):
    """Save the list of largest files to a text file."""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"Top {len(top_files)} largest files in current directory:\n")
        f.write("-" * 50 + "\n")
        for i, (filename, size_mb) in enumerate(top_files, 1):
            f.write(f"{i}. {filename}: {size_mb} MB\n")
    print(f"\nResults saved to '{output_file}'")

def main():
    """Main function to execute the script."""
    print("Finding the top 5 largest files in current directory...\n")
    
    # Get top 5 largest files
    top_files = get_top_largest_files(5)
    
    # Print results
    print_top_files(top_files)
    
    # Save to file
    save_to_file(top_files)
    
    print(f"\nDone! Found {len(top_files)} files.")

if __name__ == "__main__":
    main()