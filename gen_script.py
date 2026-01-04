import os
files = [(f, os.path.getsize(f)) for f in os.listdir(".") if os.path.isfile(f)]
files.sort(key=lambda x: x[1], reverse=True)
top5 = files[:5]
print("Top 5 largest files:")
for i, (name, size) in enumerate(top5, 1):
    print(f"{i}. {name}: {size/(1024*1024):.2f} MB")
with open("largest_files.txt", "w") as out:
    out.write("Top 5 Largest Files in Current Directory\n")
    out.write("="*60 + "\n")
    out.write("{:<6} {:<40} {:<12}\n".format("Rank", "Filename", "Size (MB)"))
    out.write("-"*60 + "\n")
    for i, (name, size) in enumerate(top5, 1):
        out.write("{:<6} {:<40} {:>10.2f} MB\n".format(i, name, size/(1024*1024)))
    out.write("="*60 + "\n")
print("Saved to largest_files.txt")