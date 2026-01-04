#!/usr/bin/env python3
import os

def get_file_size(fp):
    try:
        return os.path.getsize(fp)
    except:
        return 0

def find_largest_files(d=".", n=5):
    fs = []
    for f in os.listdir(d):
        p = os.path.join(d, f)
        if os.path.isfile(p):
            fs.append((f, get_file_size(p)))
    fs.sort(key=lambda x: x[1], reverse=True)
    return fs[:n]

def format_size(b):
    return b / (1024 * 1024)

def display_files(fl):
    print("=" * 60)
    print("Top 5 Largest Files in Current Directory")
    print("=" * 60)
    print(f'{"Rank":<6} {"Filename":<40} {"Size (MB)":<12}')
    print("-" * 60)
    for r, (f, s) in enumerate(fl, 1):
        print(f'{r:<6} {f:<40} {format_size(s):>10.2f} MB')
    print("=" * 60)
