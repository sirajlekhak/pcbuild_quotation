import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function getPlatformPaths() {
  const isWindows = os.platform() === 'win32';
  return {
    pythonExecutable: isWindows ? 'python.exe' : 'python3',
    scriptsDir: isWindows ? 'Scripts' : 'bin',
    pathSeparator: isWindows ? ';' : ':'
  };
}

async function downloadFile(url, destination) {
  const https = await import('https');
  const fsPromises = await import('fs/promises');
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => reject(err));
    });
  });
}

function installDependencies() {
  try {
    console.log('\x1b[36mStarting Python dependency installation...\x1b[0m');
    
    const { pythonExecutable, scriptsDir, pathSeparator } = getPlatformPaths();
    const resourcesPath = path.join(__dirname, '..');
    const pythonPath = path.join(resourcesPath, 'python', pythonExecutable);
    const requirementsPath = path.join(resourcesPath, 'requirements.txt');
    const pythonScriptsPath = path.join(resourcesPath, 'python', scriptsDir);
    const pipPath = path.join(pythonScriptsPath, isWindows ? 'pip.exe' : 'pip');

    // Verify Python exists
    if (!fs.existsSync(pythonPath)) {
      throw new Error(`Python executable not found at ${pythonPath}`);
    }

    // Verify requirements.txt exists
    if (!fs.existsSync(requirementsPath)) {
      throw new Error(`requirements.txt not found at ${requirementsPath}`);
    }

    // Get Python version
    console.log('\x1b[33mVerifying Python installation...\x1b[0m');
    const pythonVersion = execSync(`"${pythonPath}" --version`).toString().trim();
    console.log(`\x1b[32mUsing Python: ${pythonVersion}\x1b[0m`);

    // Install pip if needed
    if (!fs.existsSync(pipPath)) {
      console.log('\x1b[33mInstalling pip...\x1b[0m');
      const getPipUrl = 'https://bootstrap.pypa.io/get-pip.py';
      const getPipPath = path.join(resourcesPath, 'get-pip.py');
      
      try {
        await downloadFile(getPipUrl, getPipPath);
        execSync(`"${pythonPath}" "${getPipPath}" --no-warn-script-location`, { 
          stdio: 'inherit',
          env: {
            ...process.env,
            PATH: `${pythonScriptsPath}${pathSeparator}${process.env.PATH}`
          }
        });
      } finally {
        if (fs.existsSync(getPipPath)) {
          fs.unlinkSync(getPipPath);
        }
      }
    }

    // Install dependencies
    console.log('\x1b[33mInstalling dependencies...\x1b[0m');
    const env = {
      ...process.env,
      PATH: `${pythonScriptsPath}${pathSeparator}${process.env.PATH}`,
      PYTHONPATH: path.join(resourcesPath, 'python', 'Lib', 'site-packages')
    };

    try {
      execSync(`"${pipPath}" install --no-warn-script-location -r "${requirementsPath}"`, {
        stdio: 'inherit',
        env
      });
    } catch (installError) {
      console.log('\x1b[33mFalling back to python -m pip...\x1b[0m');
      execSync(`"${pythonPath}" -m pip install --no-warn-script-location -r "${requirementsPath}"`, {
        stdio: 'inherit',
        env
      });
    }

    console.log('\x1b[32mDependencies installed successfully!\x1b[0m');
    return true;
  } catch (error) {
    console.error('\x1b[31mDependency installation failed:\x1b[0m', error.message);
    return false;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  installDependencies().then(success => process.exit(success ? 0 : 1));
}

export default installDependencies;