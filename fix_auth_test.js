const fs = require('fs');

const data = fs.readFileSync('src/lib/__tests__/auth.test.ts', 'utf8');

// The file seems to have merge conflict markers
// We need to resolve them

const contentWithoutMarkers = data
    .replace(/<<<<<<< HEAD\n/g, '')
    .replace(/=======\n/g, '')
    .replace(/>>>>>>> origin\/test\/auth-update-session-4107648528377162357\n/g, '');

fs.writeFileSync('src/lib/__tests__/auth.test.ts', contentWithoutMarkers, 'utf8');
