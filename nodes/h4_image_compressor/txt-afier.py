import os
import shutil

# Define file types to target
TARGET_EXTENSIONS = ['.js', '.html', '.css', '.py']

# Walk through current directory and subdirectories
for root, dirs, files in os.walk('.'):
    for file in files:
        file_path = os.path.join(root, file)
        base, ext = os.path.splitext(file)

        if ext in TARGET_EXTENSIONS:
            # Create new filename with type prefix and .txt extension
            new_filename = f"{base}-{ext[1:]}.txt"
            new_path = os.path.join(root, new_filename)

            # Copy original file to new file, overwriting if it exists
            shutil.copyfile(file_path, new_path)
            print(f"Overwritten or created: {new_path}")
