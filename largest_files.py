#!/usr/bin/env python3
"""
Script to list the top 5 largest files in the current directory,
print their sizes in MB, and save the list to 'largest_files.txt'.
"""

import os
from pathlib import Path


def get_file_size(file_path):
    """
    Get the size of a file in bytes.
    
    Args:
        file_path (Path): Path object representing the file
        
    Returns:
        int: File size in bytes, or 0 if file doesn't exist
    """
    try:
        return file_path.stat().st_size
    except (OSError, FileNotFoundError):
        return 0


def find_largest_files(directory='.', count=5):
    """
    Find the largest files in the specified directory.
    
    Args:
        directory (str): Directory to search in (default: current directory)
        count (int): Number of largest files to return (default: 5)
        
    Returns:
        list: List of tuples (file_path, size_in_bytes) sorted by size descending
    """
    path = Path(directory)
    
    # Get all files in the directory (excluding subdirectories)
    files = []
    for item in path.iterdir():
        if item.is_file():
            size = get_file_size(item)
            files.append((item, size))
    
    # Sort by size in descending order and return top count
    files.sort(key=lambda x: x[1], reverse=True)
    return files[:count]


def format_size(bytes_size):
    """
    Convert bytes to megabytes with 2 decimal places.
    
    Args:
        bytes_size (int): Size in bytes
        
    Returns:
        str: Size formatted in MB
    """
    mb_size = bytes_size / (1024 * 1024)
    return f"{mb_size:.2f} MB"


def print_results(files_data):
    """
    Print the largest files with their sizes.
    
    Args:
        files_data (list): List of tuples (file_path, size_in_bytes)
    """
    print("=" * 60)
    print("Top 5 Largest Files in Current Directory:")
    print("=" * 60)
    
    if not files_data:
        print("No files found.")
        return
    
    for i, (file_path, size) in enumerate(files_data, 1):
        print(f"{i}. {file_path.name:<40} {format_size(size):>12}")


def save_to_file(files_data, filename='largest_files.txt'):
    """
    Save the list of largest files to a text file.
    
    Args:
        files_data (list): List of tuples (file_path, size_in_bytes)
        filename (str): Name of the file to save to
    """
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("Top 5 Largest Files in Current Directory\n")
        f.write("=" * 60 + "\n")
        f.write(f"{'Rank':<6} {'Filename':<40} {'Size':<15}\n")
        f.write("-" * 60 + "\n")
        
        for i, (file_path, size) in enumerate(files_data, 1):
            f.write(f"{i:<6} {file_path.name:<40} {format_size(size):<15}\n")
    
    print(f"\nList saved to '{filename}'")


def main():
    """Main function to execute the script."""
    # Find largest files
    largest_files = find_largest_files('.', 5)
    
    # Print results
    print_results(largest_files)
    
    # Save to file
    save_to_file(largest_files, 'largest_files.txt')


if __name__ == '__main__':
    main()