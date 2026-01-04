#!/usr/bin/env python3
"""
Script to find and list the top 5 largest files in the current directory.
Displays file sizes in MB and saves the list to 'largest_files.txt'.
"""

import os
import sys
from pathlib import Path


def get_file_size_mb(file_path):
    """Get file size in MB."""
    try:
        size_bytes = os.path.getsize(file_path)
        size_mb = size_bytes / (1024 * 1024)
        return size_mb
    except (OSError, FileNotFoundError):
        return 0


def get_files_with_sizes(directory):
    """Get all files in directory with their sizes."""
    files_with_sizes = []
    
    try:
        directory_path = Path(directory)
        
        # Get all files (excluding directories)
        for item in directory_path.iterdir():
            if item.is_file():
                size_mb = get_file_size_mb(item)
                files_with_sizes.append((str(item.name), size_mb, str(item)))
        
        return files_with_sizes
    except (OSError, PermissionError) as e:
        print(f"Error accessing directory {directory}: {e}")
        return []


def sort_files_by_size(files_with_sizes):
    """Sort files by size in descending order."""
    return sorted(files_with_sizes, key=lambda x: x[1], reverse=True)


def format_output(files_with_sizes, top_n=5):
    """Format the output string for display and saving."""
    if not files_with_sizes:
        return "No files found in current directory."
    
    output = f"Top {min(top_n, len(files_with_sizes))} Largest Files in Current Directory:\n"
    output += "=" * 60 + "\n"
    
    for i, (filename, size_mb, full_path) in enumerate(files_with_sizes[:top_n], 1):
        output += f"{i}. {filename}\n"
        output += f"   Size: {size_mb:.2f} MB\n"
        output += f"   Path: {full_path}\n"
        
        if i < len(files_with_sizes[:top_n]):
            output += "\n"
    
    return output


def save_to_file(output, filename="largest_files.txt"):
    """Save the output to a text file."""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"Results saved to {filename}")
        return True
    except OSError as e:
        print(f"Error saving to {filename}: {e}")
        return False


def main():
    """Main function to execute the script."""
    # Get current directory
    current_dir = os.getcwd()
    print(f"Scanning directory: {current_dir}\n")
    
    # Get all files with their sizes
    files_with_sizes = get_files_with_sizes(current_dir)
    
    if not files_with_sizes:
        print("No files found in current directory.")
        return
    
    # Sort files by size (descending)
    sorted_files = sort_files_by_size(files_with_sizes)
    
    # Get top 5 files
    top_5_files = sorted_files[:5]
    
    # Format output
    output = format_output(top_5_files, top_n=5)
    
    # Display results
    print(output)
    
    # Save to file
    save_to_file(output, "largest_files.txt")


if __name__ == "__main__":
    main()