const fs = require('fs');
   const path = require('path');
   const ffprobeStatic = require('ffprobe-static');

   const expectedPath = ffprobeStatic.path;
   console.log('Expected ffprobe path:', expectedPath);

   if (fs.existsSync(expectedPath)) {
     console.log('ffprobe binary exists at the expected location.');
   } else {
     console.log('ffprobe binary not found at the expected location.');
     
     // Check if it exists in the project directory
     const projectPath = path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', process.platform, process.arch, 'ffprobe');
     console.log('Checking project directory:', projectPath);
     
     if (fs.existsSync(projectPath)) {
       console.log('ffprobe binary found in the project directory.');
     } else {
       console.log('ffprobe binary not found in the project directory.');
     }
   }
   