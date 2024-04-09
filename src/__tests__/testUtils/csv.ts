import fs from 'fs';
import rl from 'readline';

export function readCSV(filePath: string, delimiter = ','): Promise<string[][]> {
  return new Promise((resolve) => {
    const parser = rl.createInterface({
      input: fs.createReadStream(filePath)
    });

    const data: string[][] = [];

    parser
      .on('line', line => {
        data.push(line.split(delimiter));
      })
      .on('close', () => resolve(data));
  });
}
