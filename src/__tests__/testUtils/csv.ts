import fs from 'fs';
import rl from 'readline';

export function readCSV(filePath: string, delimiter = ','): Promise<string[][]> {
  const parser = rl.createInterface({
    terminal: false,
    input: fs.createReadStream(filePath)
  });

  return new Promise((resolve) => {
    const data: string[][] = [];

    parser
      .on('line', line => {
        data.push(line.split(delimiter));
      })
      .on('close', () => resolve(data));
  });
}
