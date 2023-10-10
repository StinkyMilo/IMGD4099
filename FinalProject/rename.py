# Wow. Renaming this project was a pain.
import os
rootdir = 'C:\\Users\\Milo\\Documents\\IMGD4900\\FinalProject'

for subdir, dirs, files in os.walk(rootdir):
    try:
        newsubdir = subdir.replace("TestWebApp","WiiDiffusion",200)
        os.rename(subdir,newsubdir)
        for file in files:
            filename = os.path.join(newsubdir, file)
            os.rename(filename,filename.replace("TestWebApp","WiiDiffusion",200))
        print("Rename successful")
    except:
        pass