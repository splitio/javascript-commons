import fs from 'fs';

export function readCSV(filePath: string, delimiter = ','): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) return reject(err);

      const lines = content.split(/\r?\n/);
      const data = lines
        .filter(line => line.trim().length > 0)
        .map(line => line.split(delimiter));

      resolve(data);
    });
  });
}
